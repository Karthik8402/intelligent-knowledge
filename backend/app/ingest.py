from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import UploadFile
from langchain_community.document_loaders import Docx2txtLoader, PyPDFLoader, TextLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .config import get_settings
from .storage import content_hash_from_path, create_document_id, registry


def _save_upload(file: UploadFile, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("wb") as out:
        while True:
            chunk = file.file.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)


def _load_documents(path: Path) -> list[Document]:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return PyPDFLoader(str(path)).load()
    if suffix in {".txt", ".md"}:
        return TextLoader(str(path), encoding="utf-8").load()
    if suffix == ".docx":
        return Docx2txtLoader(str(path)).load()

    raise ValueError(f"Unsupported file type: {suffix}")


def _enrich_metadata(documents: list[Document], document_id: str, file_name: str) -> list[Document]:
    enriched = []
    for index, doc in enumerate(documents):
        page = doc.metadata.get("page") if isinstance(doc.metadata, dict) else None
        metadata = {
            "document_id": document_id,
            "file_name": file_name,
            "page": page,
            "source_type": Path(file_name).suffix.replace(".", ""),
            "chunk_index": index,
            "created_at": datetime.now(UTC).isoformat(),
        }
        enriched.append(Document(page_content=doc.page_content, metadata=metadata))

    return enriched


def ingest_files(files: list[UploadFile], vector_store: Any) -> list[dict]:
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

            extension = Path(upload.filename).suffix.lower()
            if extension not in {".pdf", ".txt", ".md", ".docx"}:
                raise ValueError("Unsupported file type")

            destination = Path(settings.upload_dir) / upload.filename
            _save_upload(upload, destination)
            max_bytes = settings.max_upload_size_mb * 1024 * 1024
            if destination.stat().st_size > max_bytes:
                destination.unlink(missing_ok=True)
                raise ValueError(f"File exceeds max size of {settings.max_upload_size_mb} MB")

            file_hash = content_hash_from_path(destination)
            existing = registry.find_by_hash(file_hash)
            if existing:
                results.append(
                    {
                        "document_id": existing["document_id"],
                        "file_name": existing["file_name"],
                        "pages": existing.get("pages", 0),
                        "chunks": existing.get("chunks", 0),
                        "status": "duplicate",
                        "error": None,
                    }
                )
                continue

            document_id = create_document_id(file_hash)
            base_docs = _load_documents(destination)
            if not base_docs:
                raise ValueError("Document is empty or unreadable")

            chunks = splitter.split_documents(base_docs)
            chunks = _enrich_metadata(chunks, document_id, upload.filename)
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
            elif hasattr(vector_store, "save_local"):
                faiss_dir = str(Path(settings.upload_dir).parent / "faiss")
                vector_store.save_local(faiss_dir)

            record = {
                "document_id": document_id,
                "file_name": upload.filename,
                "source_type": extension.replace(".", ""),
                "pages": len(base_docs),
                "chunks": len(chunks),
                "content_hash": file_hash,
                "created_at": datetime.now(UTC).isoformat(),
            }
            registry.upsert(record)

            results.append(
                {
                    "document_id": document_id,
                    "file_name": upload.filename,
                    "pages": len(base_docs),
                    "chunks": len(chunks),
                    "status": "indexed",
                    "error": None,
                }
            )
        except Exception as exc:
            results.append(
                {
                    "document_id": "",
                    "file_name": upload.filename or "unknown",
                    "pages": 0,
                    "chunks": 0,
                    "status": "failed",
                    "error": str(exc),
                }
            )

    return results
