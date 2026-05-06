"""Vector store builder and retrieval — dual-mode: ChromaDB (local) or pgvector (Supabase)."""

from __future__ import annotations

import logging
from typing import Any

from langchain_core.embeddings import Embeddings

from .config import get_settings

logger = logging.getLogger(__name__)


def build_vector_store(embeddings: Embeddings):
    """Build or connect to the vector store based on config."""
    settings = get_settings()

    if settings.vector_store.lower() == "pgvector":
        return _build_pgvector_store(embeddings)

    if settings.vector_store.lower() == "faiss":
        return _build_faiss_store(embeddings)

    # Default: ChromaDB
    return _build_chroma_store(embeddings)


def _build_pgvector_store(embeddings: Embeddings):
    """Connect to Supabase Postgres with pgvector extension."""
    from langchain_postgres import PGVector

    settings = get_settings()
    connection_string = settings.database_url

    if not connection_string:
        raise ValueError("DATABASE_URL is required when VECTOR_STORE=pgvector")

    store = PGVector(
        embeddings=embeddings,
        connection=connection_string,
        collection_name="knowledge_base",
        use_jsonb=True,
    )
    logger.info("pgvector store connected to Supabase Postgres")
    return store


def _build_chroma_store(embeddings: Embeddings):
    """Build a local ChromaDB store."""
    from langchain_chroma import Chroma

    settings = get_settings()
    return Chroma(
        persist_directory=settings.chroma_persist_dir,
        embedding_function=embeddings,
        collection_name="knowledge_base",
    )


def _build_faiss_store(embeddings: Embeddings):
    """Build a local FAISS store."""
    from pathlib import Path

    from langchain_community.vectorstores import FAISS

    settings = get_settings()
    faiss_dir = str(Path(settings.upload_dir).parent / "faiss")
    if Path(faiss_dir).exists():
        try:
            return FAISS.load_local(faiss_dir, embeddings, allow_dangerous_deserialization=True)
        except Exception:
            pass
    return FAISS.from_texts(["bootstrap"], embedding=embeddings)


def retrieve_chunks(
    vector_store: Any,
    question: str,
    top_k: int,
    document_ids: list[str] | None = None,
):
    """Retrieve relevant chunks from the vector store."""
    settings = get_settings()
    store_type = settings.vector_store.lower()

    # ── pgvector retrieval ──
    if store_type == "pgvector":
        filters = None
        if document_ids:
            filters = {"document_id": {"$in": document_ids}}

        docs = vector_store.similarity_search_with_relevance_scores(
            query=question,
            k=top_k,
            filter=filters,
        )
        return docs

    # ── ChromaDB retrieval ──
    if store_type == "chroma":
        filters = None
        if document_ids:
            filters = {"document_id": {"$in": document_ids}}

        docs = vector_store.similarity_search_with_relevance_scores(
            query=question,
            k=top_k,
            filter=filters,
        )
        return docs

    # ── FAISS fallback ──
    docs = vector_store.similarity_search_with_score(query=question, k=top_k)
    normalized = []
    for doc, score in docs:
        normalized.append((doc, float(score)))
    return normalized
