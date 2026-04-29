"""Document management routes: upload, list, delete, chunks."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, UploadFile

from ..config import get_settings
from ..dependencies import get_registry, get_vector_store
from ..exceptions import DocumentNotFoundError, NoFilesUploadedError
from ..ingest import ingest_files
from ..models import DocumentIngestResult, DocumentsListResponse
from ..storage import DocumentRegistry

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=list[DocumentIngestResult])
def upload_documents(
    files: list[UploadFile] = File(...),
    vector_store: Any = Depends(get_vector_store),
    reg: DocumentRegistry = Depends(get_registry),
):
    if not files:
        raise NoFilesUploadedError()

    logger.info("Upload request received: %d file(s)", len(files))
    results = ingest_files(files, vector_store)
    logger.info("Upload complete: %s", [r["status"] for r in results])
    return results


@router.get("", response_model=DocumentsListResponse)
def list_documents(reg: DocumentRegistry = Depends(get_registry)):
    return {"documents": reg.list_documents()}


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    vector_store: Any = Depends(get_vector_store),
    reg: DocumentRegistry = Depends(get_registry),
):
    settings = get_settings()
    doc = reg.get(document_id)
    if not doc:
        raise DocumentNotFoundError(document_id)

    logger.info("Deleting document %s (%s)", document_id, doc.get("file_name"))

    if settings.vector_store.lower() == "chroma":
        vector_store.delete(where={"document_id": document_id})
        if hasattr(vector_store, "persist"):
            vector_store.persist()

    removed = reg.delete(document_id)

    upload_path = Path(settings.upload_dir) / doc.get("file_name", "")
    if upload_path.exists():
        upload_path.unlink(missing_ok=True)

    return {"status": "deleted", "document": removed}


@router.get("/{document_id}/chunks")
def get_chunks(
    document_id: str,
    vector_store: Any = Depends(get_vector_store),
):
    settings = get_settings()
    chunks: list[dict] = []

    if hasattr(vector_store, "docstore"):
        for doc in vector_store.docstore._dict.values():
            if doc.metadata.get("document_id") == document_id:
                text = doc.page_content if hasattr(doc, "page_content") else str(doc)
                chunks.append({"text": text, "page": doc.metadata.get("page")})
    elif hasattr(vector_store, "get"):
        try:
            res = vector_store.get(where={"document_id": document_id})
            for doc_text, meta in zip(res.get("documents", []), res.get("metadatas", [])):
                chunks.append({"text": doc_text, "page": meta.get("page")})
        except Exception:
            logger.warning("Failed to query chunks for document %s", document_id)

    return {"document_id": document_id, "chunks": chunks}
