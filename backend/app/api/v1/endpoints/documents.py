"""Document management routes: upload, list, delete, chunks — secured."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, File, UploadFile

from app.core.auth import UserContext, get_current_user
from app.dependencies import get_registry, get_vector_store
from app.schemas import DocumentIngestResult, DocumentsListResponse
from app.services.document_service import DocumentService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=list[DocumentIngestResult])
def upload_documents(
    files: list[UploadFile] = File(...),
    vector_store: Any = Depends(get_vector_store),
    user: UserContext = Depends(get_current_user),
):
    return DocumentService.upload_documents(files, vector_store, user.user_id)


@router.get("", response_model=DocumentsListResponse)
def list_documents(
    reg=Depends(get_registry),
    user: UserContext = Depends(get_current_user),
):
    return {"documents": DocumentService.list_documents(reg, user.user_id)}


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    vector_store: Any = Depends(get_vector_store),
    reg=Depends(get_registry),
    user: UserContext = Depends(get_current_user),
):
    return DocumentService.delete_document(document_id, vector_store, reg, user.user_id)


@router.get("/{document_id}/chunks")
def get_chunks(
    document_id: str,
    vector_store: Any = Depends(get_vector_store),
    _user: UserContext = Depends(get_current_user),
):
    chunks = DocumentService.get_chunks(document_id, vector_store)
    return {"document_id": document_id, "chunks": chunks}
