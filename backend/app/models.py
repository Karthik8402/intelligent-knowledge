"""Pydantic models with strict validation for API contracts."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


class Citation(BaseModel):
    document_id: str = Field(max_length=64)
    file_name: str = Field(max_length=255)
    page: int | None = None
    snippet: str = Field(max_length=500)


class RetrievedChunk(BaseModel):
    document_id: str = Field(max_length=64)
    file_name: str = Field(max_length=255)
    page: int | None = None
    score: float | None = None
    text: str = Field(max_length=2000)


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    document_ids: list[str] | None = None

    @field_validator("question")
    @classmethod
    def sanitize_question(cls, v: str) -> str:
        """Strip leading/trailing whitespace and null bytes."""
        return v.strip().replace("\x00", "")


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
    retrieved_chunks: list[RetrievedChunk]


class DocumentIngestResult(BaseModel):
    document_id: str
    file_name: str = Field(max_length=255)
    pages: int
    chunks: int
    status: str = Field(max_length=20)
    error: str | None = None


class DocumentMetadata(BaseModel):
    document_id: str = Field(max_length=64)
    file_name: str = Field(max_length=255)
    source_type: str = Field(max_length=10)
    pages: int
    chunks: int
    content_hash: str = Field(max_length=128)
    created_at: datetime


class DocumentsListResponse(BaseModel):
    documents: list[DocumentMetadata]


class ErrorResponse(BaseModel):
    error: str
    details: dict[str, Any] | None = None


# --- System models ---


class SettingsUpdate(BaseModel):
    """Request body for PUT /settings."""
    rag_top_k: int | None = Field(None, ge=1, le=20)
    llm_provider: str | None = Field(None, max_length=20)
    vector_store: str | None = Field(None, max_length=20)


class SettingsResponse(BaseModel):
    """Response body for GET /settings and PUT /settings."""
    rag_top_k: int
    llm_provider: str
    vector_store: str


class StatusResponse(BaseModel):
    """Response body for GET /status."""
    vector_store: str
    llm_provider: str
    store_initialized: bool
    embeddings_loaded: bool
    documents: int
    chunks: int


class HealthResponse(BaseModel):
    """Response body for GET /health."""
    status: str
