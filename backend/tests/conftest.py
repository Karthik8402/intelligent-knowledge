"""Shared pytest fixtures for the Intelligent Knowledge Base test suite."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from langchain_core.documents import Document

# ---------------------------------------------------------------------------
# Ensure test-safe environment variables before any app module imports
# ---------------------------------------------------------------------------
os.environ.setdefault("GOOGLE_API_KEY", "test-key-not-real")
os.environ.setdefault("METADATA_DB_PATH", "./data/test_registry.json")
os.environ.setdefault("SQLITE_DB_PATH", "./data/test_knowledge_base.db")
os.environ.setdefault("STORAGE_BACKEND", "local")
os.environ.setdefault("VECTOR_STORE", "chroma")
os.environ.setdefault("AUTH_ENABLED", "false")


# ---------------------------------------------------------------------------
# Document factory
# ---------------------------------------------------------------------------
def make_document(
    text: str = "sample text",
    document_id: str = "doc-001",
    file_name: str = "test.pdf",
    page: int | None = 0,
) -> Document:
    """Create a LangChain Document with standard metadata."""
    return Document(
        page_content=text,
        metadata={
            "document_id": document_id,
            "file_name": file_name,
            "page": page,
            "source_type": "pdf",
            "chunk_index": 0,
            "owner_id": "anonymous",
            "created_at": "2026-01-01T00:00:00+00:00",
        },
    )


# ---------------------------------------------------------------------------
# Temporary document registry
# ---------------------------------------------------------------------------
@pytest.fixture()
def tmp_registry(tmp_path: Path):
    """Create a LocalDocumentRegistry backed by a temporary JSON file."""
    from app.config import get_settings

    # Clear the lru_cache so we can inject a temp path
    get_settings.cache_clear()

    db_path = tmp_path / "registry.json"
    os.environ["METADATA_DB_PATH"] = str(db_path)
    os.environ["UPLOAD_DIR"] = str(tmp_path / "uploads")
    os.environ["CHROMA_PERSIST_DIR"] = str(tmp_path / "chroma")
    os.environ["SQLITE_DB_PATH"] = str(tmp_path / "knowledge_base.db")
    os.environ["STORAGE_BACKEND"] = "local"
    os.environ["AUTH_ENABLED"] = "false"

    from app.storage import LocalDocumentRegistry

    reg = LocalDocumentRegistry()
    yield reg

    # Cleanup
    get_settings.cache_clear()


# ---------------------------------------------------------------------------
# Mock vector store
# ---------------------------------------------------------------------------
@pytest.fixture()
def mock_vector_store() -> MagicMock:
    """Return a mock that quacks like a LangChain vector store."""
    store = MagicMock()
    store.similarity_search_with_relevance_scores.return_value = []
    store.similarity_search_with_score.return_value = []
    store.add_documents.return_value = None
    store.delete.return_value = None
    return store


# ---------------------------------------------------------------------------
# FastAPI test client (with mocked dependencies)
# ---------------------------------------------------------------------------
@pytest.fixture()
def test_client(tmp_registry, mock_vector_store) -> TestClient:
    """TestClient wired with mocked vector store and temporary registry."""
    from app.dependencies import set_embeddings, set_vector_store
    from app.main import app

    set_vector_store(mock_vector_store)
    set_embeddings(MagicMock())

    # Override the registry dependency to use our temp one
    from app import dependencies

    original_get_registry = dependencies.get_registry

    def _override_registry():
        return tmp_registry

    dependencies.get_registry = _override_registry

    client = TestClient(app)
    yield client

    # Restore
    dependencies.get_registry = original_get_registry
    set_vector_store(None)
    set_embeddings(None)


# ---------------------------------------------------------------------------
# Sample documents fixture
# ---------------------------------------------------------------------------
@pytest.fixture()
def sample_doc_record() -> dict:
    return {
        "document_id": "abc123def456",
        "file_name": "test_report.pdf",
        "source_type": "pdf",
        "pages": 5,
        "chunks": 12,
        "content_hash": "abc123def456ghij789klmno",
        "owner_id": "anonymous",
        "created_at": "2026-01-01T00:00:00+00:00",
    }
