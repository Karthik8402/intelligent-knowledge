"""FastAPI dependency injection for shared resources."""

from __future__ import annotations

import logging
from typing import Any

from .exceptions import VectorStoreNotInitializedError
from .storage import DocumentRegistry, registry

logger = logging.getLogger(__name__)

# Module-level state managed by the lifespan context
_vector_store: Any = None
_embeddings: Any = None


def set_vector_store(store: Any) -> None:
    global _vector_store
    _vector_store = store


def set_embeddings(emb: Any) -> None:
    global _embeddings
    _embeddings = emb


def get_vector_store() -> Any:
    """Dependency that provides the active vector store, or raises if unavailable."""
    if _vector_store is None:
        raise VectorStoreNotInitializedError()
    return _vector_store


def get_vector_store_optional() -> Any | None:
    """Dependency that provides the vector store or None (non-failing)."""
    return _vector_store


def get_embeddings_instance() -> Any | None:
    """Dependency that provides the embeddings model."""
    return _embeddings


def get_registry() -> DocumentRegistry:
    """Dependency that provides the document registry."""
    return registry
