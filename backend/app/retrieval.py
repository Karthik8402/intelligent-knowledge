from __future__ import annotations

from typing import Any

from langchain_community.vectorstores import FAISS
from langchain_chroma import Chroma
from langchain_core.embeddings import Embeddings

from .config import get_settings


def build_vector_store(embeddings: Embeddings):
    settings = get_settings()
    if settings.vector_store.lower() == "faiss":
        from pathlib import Path
        faiss_dir = str(Path(settings.upload_dir).parent / "faiss")
        if Path(faiss_dir).exists():
            try:
                return FAISS.load_local(faiss_dir, embeddings, allow_dangerous_deserialization=True)
            except Exception:
                pass
        return FAISS.from_texts(["bootstrap"], embedding=embeddings)

    return Chroma(
        persist_directory=settings.chroma_persist_dir,
        embedding_function=embeddings,
        collection_name="knowledge_base",
    )


def retrieve_chunks(vector_store: Any, question: str, top_k: int, document_ids: list[str] | None = None):
    settings = get_settings()
    filters = None
    if document_ids:
        if settings.vector_store.lower() == "chroma":
            filters = {"document_id": {"$in": document_ids}}

    if settings.vector_store.lower() == "chroma":
        docs = vector_store.similarity_search_with_relevance_scores(
            query=question,
            k=top_k,
            filter=filters,
        )
        return docs

    docs = vector_store.similarity_search_with_score(query=question, k=top_k)
    normalized = []
    for doc, score in docs:
        normalized.append((doc, float(score)))
    return normalized
