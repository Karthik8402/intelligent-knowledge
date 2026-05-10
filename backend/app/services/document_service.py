import logging
from pathlib import Path
from typing import Any

from app.config import get_settings
from app.exceptions import DocumentNotFoundError, NoFilesUploadedError
from app.ingest import ingest_files

logger = logging.getLogger(__name__)


class DocumentService:
    @staticmethod
    def upload_documents(files: list, vector_store: Any, owner_id: str):
        if not files:
            raise NoFilesUploadedError()

        logger.info("Upload request from user=%s: %d file(s)", owner_id, len(files))
        results = ingest_files(files, vector_store, owner_id=owner_id)
        logger.info("Upload complete: %s", [r["status"] for r in results])
        return results

    @staticmethod
    def list_documents(reg: Any, owner_id: str):
        return reg.list_documents(owner_id=owner_id)

    @staticmethod
    def delete_document(document_id: str, vector_store: Any, reg: Any, owner_id: str):
        settings = get_settings()
        doc = reg.get(document_id)
        if not doc:
            raise DocumentNotFoundError(document_id)

        # Authorization: only the owner can delete
        if settings.auth_enabled and doc.get("owner_id") and doc["owner_id"] != owner_id:
            raise DocumentNotFoundError(document_id)

        logger.info(
            "Deleting document %s (%s) by user=%s", document_id, doc.get("file_name"), owner_id
        )

        # Delete from vector store
        if settings.vector_store.lower() in {"chroma", "pgvector"}:
            try:
                if hasattr(vector_store, "delete"):
                    vector_store.delete(where={"document_id": document_id})
                    if hasattr(vector_store, "persist"):
                        vector_store.persist()
            except Exception as e:
                logger.warning("Failed to delete chunks from vector store: %s", e)

        removed = reg.delete(document_id)

        # Delete file from storage
        if settings.storage_backend == "supabase":
            from app.core.supabase import delete_file_from_storage

            delete_file_from_storage(doc.get("file_name", ""))
        else:
            upload_path = Path(settings.upload_dir) / doc.get("file_name", "")
            if upload_path.exists():
                upload_path.unlink(missing_ok=True)

        return {"status": "deleted", "document": removed}

    @staticmethod
    def get_chunks(document_id: str, vector_store: Any):
        chunks: list[dict] = []

        if hasattr(vector_store, "docstore"):
            for doc in vector_store.docstore._dict.values():
                if doc.metadata.get("document_id") == document_id:
                    text = doc.page_content if hasattr(doc, "page_content") else str(doc)
                    chunks.append({"text": text, "page": doc.metadata.get("page")})
        elif hasattr(vector_store, "get"):
            try:
                res = vector_store.get(where={"document_id": document_id})
                for doc_text, meta in zip(
                    res.get("documents", []), res.get("metadatas", []), strict=False
                ):
                    chunks.append({"text": doc_text, "page": meta.get("page")})
            except Exception:
                logger.warning("Failed to query chunks for document %s", document_id)

        return chunks
