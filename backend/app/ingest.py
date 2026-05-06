"""Document ingestion pipeline — dual-mode: local filesystem or Supabase Storage."""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import UploadFile
from langchain_community.document_loaders import Docx2txtLoader, PyPDFLoader, TextLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .config import get_settings
from .storage import content_hash_from_bytes, content_hash_from_path, create_document_id, registry

logger = logging.getLogger(__name__)

# Allowed file extensions and their MIME types
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".docx"}
MAGIC_BYTES = {
    ".pdf": b"%PDF",
    ".docx": b"PK",  # ZIP archive (OOXML)
}


def _validate_file_type(file_name: str, file_bytes: bytes) -> str:
    """Validate file extension and magic bytes. Returns the extension."""
    extension = Path(file_name).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {extension}")

    # Magic byte validation for binary formats
    expected_magic = MAGIC_BYTES.get(extension)
    if expected_magic and not file_bytes[:len(expected_magic)].startswith(expected_magic):
        raise ValueError(
            f"File content does not match expected format for {extension}. "
            "Possible file type spoofing detected."
        )

    return extension


def _save_upload_local(file: UploadFile, destination: Path) -> bytes:
    """Save an upload to local filesystem and return its bytes."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    file_bytes = file.file.read()
    destination.write_bytes(file_bytes)
    return file_bytes


def _load_documents(path: Path) -> list[Document]:
    """Parse a document file into LangChain Documents."""
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return PyPDFLoader(str(path)).load()
    if suffix in {".txt", ".md"}:
        return TextLoader(str(path), encoding="utf-8").load()
    if suffix == ".docx":
        return Docx2txtLoader(str(path)).load()

    raise ValueError(f"Unsupported file type: {suffix}")


def _enrich_metadata(
    documents: list[Document],
    document_id: str,
    file_name: str,
    owner_id: str = "anonymous",
) -> list[Document]:
    """Attach structured metadata to each document chunk."""
    enriched = []
    for index, doc in enumerate(documents):
        page = doc.metadata.get("page") if isinstance(doc.metadata, dict) else None
        metadata = {
            "document_id": document_id,
            "file_name": file_name,
            "page": page,
            "source_type": Path(file_name).suffix.replace(".", ""),
            "chunk_index": index,
            "owner_id": owner_id,
            "created_at": datetime.now(UTC).isoformat(),
        }
        enriched.append(Document(page_content=doc.page_content, metadata=metadata))

    return enriched


def ingest_files(
    files: list[UploadFile],
    vector_store: Any,
    owner_id: str = "anonymous",
) -> list[dict]:
    """Ingest uploaded files into the vector store and document registry.

    Supports both local and Supabase storage backends transparently.
    """
    settings = get_settings()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.rag_chunk_size,
        chunk_overlap=settings.rag_chunk_overlap,
    )

    results = []

    for upload in files:
        try:
            if not upload.filename:
                raise ValueError("Uploaded file is missing a filename")

            # Read file bytes for validation and hashing
            file_bytes = upload.file.read()
            upload.file.seek(0)  # Reset for potential re-read

            # Validate file size
            max_bytes = settings.max_upload_size_mb * 1024 * 1024
            if len(file_bytes) > max_bytes:
                raise ValueError(f"File exceeds max size of {settings.max_upload_size_mb} MB")

            # Validate file type (extension + magic bytes)
            extension = _validate_file_type(upload.filename, file_bytes)

            # Compute content hash for duplicate detection
            file_hash = content_hash_from_bytes(file_bytes)
            existing = registry.find_by_hash(file_hash, owner_id=owner_id)
            if existing:
                results.append({
                    "document_id": existing["document_id"],
                    "file_name": existing["file_name"],
                    "pages": existing.get("pages", 0),
                    "chunks": existing.get("chunks", 0),
                    "status": "duplicate",
                    "error": None,
                })
                continue

            document_id = create_document_id(file_hash)

            # ── Save file based on storage backend ──
            if settings.storage_backend == "supabase":
                from .core.supabase import upload_file_to_storage

                upload_file_to_storage(file_bytes, upload.filename)
                # For parsing, write temporarily to a temp location
                import tempfile

                tmp = Path(tempfile.mkdtemp()) / upload.filename
                tmp.write_bytes(file_bytes)
                destination = tmp
            else:
                destination = Path(settings.upload_dir) / upload.filename
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(file_bytes)

            # Parse and chunk
            base_docs = _load_documents(destination)
            if not base_docs:
                raise ValueError("Document is empty or unreadable")

            chunks = splitter.split_documents(base_docs)
            chunks = _enrich_metadata(chunks, document_id, upload.filename, owner_id)

            # Index in vector store
            if hasattr(vector_store, "add_documents"):
                ids = [f"{document_id}:{i}" for i in range(len(chunks))]
                vector_store.add_documents(chunks, ids=ids)
            else:
                vector_store.add_texts(
                    texts=[c.page_content for c in chunks],
                    metadatas=[c.metadata for c in chunks],
                )

            if hasattr(vector_store, "persist"):
                vector_store.persist()

            # Clean up temp file if using Supabase
            if settings.storage_backend == "supabase" and destination.exists():
                destination.unlink(missing_ok=True)

            # Save metadata to registry
            record = {
                "document_id": document_id,
                "file_name": upload.filename,
                "source_type": extension.replace(".", ""),
                "pages": len(base_docs),
                "chunks": len(chunks),
                "content_hash": file_hash,
                "owner_id": owner_id,
                "created_at": datetime.now(UTC).isoformat(),
            }
            registry.upsert(record)

            results.append({
                "document_id": document_id,
                "file_name": upload.filename,
                "pages": len(base_docs),
                "chunks": len(chunks),
                "status": "indexed",
                "error": None,
            })
        except Exception as exc:
            logger.exception("Failed to ingest file: %s", upload.filename)
            results.append({
                "document_id": "",
                "file_name": upload.filename or "unknown",
                "pages": 0,
                "chunks": 0,
                "status": "failed",
                "error": str(exc),
            })

    return results
