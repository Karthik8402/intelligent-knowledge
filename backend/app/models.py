from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class Citation(BaseModel):
    document_id: str
    file_name: str
    page: int | None = None
    snippet: str


class RetrievedChunk(BaseModel):
    document_id: str
    file_name: str
    page: int | None = None
    score: float | None = None
    text: str


class ChatRequest(BaseModel):
    question: str = Field(min_length=1)
    document_ids: list[str] | None = None


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
    retrieved_chunks: list[RetrievedChunk]


class DocumentIngestResult(BaseModel):
    document_id: str
    file_name: str
    pages: int
    chunks: int
    status: str
    error: str | None = None


class DocumentMetadata(BaseModel):
    document_id: str
    file_name: str
    source_type: str
    pages: int
    chunks: int
    content_hash: str
    created_at: datetime


class DocumentsListResponse(BaseModel):
    documents: list[DocumentMetadata]


class ErrorResponse(BaseModel):
    error: str
    details: dict[str, Any] | None = None
