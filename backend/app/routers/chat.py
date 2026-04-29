"""Chat route: question answering with RAG citations + SSE streaming."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, Request
from sse_starlette.sse import EventSourceResponse

from ..citations import validate_citation_indices
from ..config import get_settings
from ..dependencies import get_registry, get_vector_store_optional
from ..generation import FALLBACK_ANSWER, answer_with_citations, stream_answer_with_citations
from ..models import ChatRequest, ChatResponse, Citation, RetrievedChunk
from ..retrieval import retrieve_chunks
from ..storage import DocumentRegistry

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])


def _build_chat_response(question: str, vector_store: Any, reg: DocumentRegistry) -> ChatResponse:
    """Core chat logic shared by both standard and streaming endpoints."""
    if not reg.list_documents() or vector_store is None:
        logger.info("Chat fallback: no documents or vector store unavailable")
        return ChatResponse(
            answer=FALLBACK_ANSWER if vector_store is not None else "Backend not configured correctly (missing API keys).",
            citations=[],
            retrieved_chunks=[],
        )

    settings = get_settings()
    retrieved = retrieve_chunks(
        vector_store=vector_store,
        question=question,
        top_k=settings.rag_top_k,
    )

    if not retrieved:
        logger.info("Chat: no relevant chunks found for question")
        return ChatResponse(answer=FALLBACK_ANSWER, citations=[], retrieved_chunks=[])

    logger.info("Chat: generating answer from %d retrieved chunks", len(retrieved))
    generation = answer_with_citations(question, retrieved)

    safe_indices = validate_citation_indices(generation.get("citation_indices", []), len(retrieved))

    citations: list[Citation] = []
    retrieved_chunks: list[RetrievedChunk] = []

    for idx, (doc, score) in enumerate(retrieved, start=1):
        meta = doc.metadata or {}
        page_value = meta.get("page")
        page_number = int(page_value) + 1 if isinstance(page_value, int) else None

        chunk_payload = RetrievedChunk(
            document_id=meta.get("document_id", "unknown"),
            file_name=meta.get("file_name", "unknown"),
            page=page_number,
            score=round(float(score), 4) if score is not None else None,
            text=doc.page_content[:800],
        )
        retrieved_chunks.append(chunk_payload)

        if idx in safe_indices:
            citations.append(
                Citation(
                    document_id=chunk_payload.document_id,
                    file_name=chunk_payload.file_name,
                    page=chunk_payload.page,
                    snippet=chunk_payload.text[:220],
                )
            )

    answer = generation.get("answer", FALLBACK_ANSWER)
    if answer != FALLBACK_ANSWER and not citations:
        answer = FALLBACK_ANSWER

    return ChatResponse(answer=answer, citations=citations, retrieved_chunks=retrieved_chunks)


@router.post("/chat", response_model=ChatResponse)
def chat(
    request: Request,
    body: ChatRequest,
    vector_store: Any = Depends(get_vector_store_optional),
    reg: DocumentRegistry = Depends(get_registry),
):
    return _build_chat_response(body.question, vector_store, reg)


@router.post("/chat/stream")
async def chat_stream(
    request: Request,
    body: ChatRequest,
    vector_store: Any = Depends(get_vector_store_optional),
    reg: DocumentRegistry = Depends(get_registry),
):
    """SSE streaming endpoint — sends tokens as they are generated."""

    if not reg.list_documents() or vector_store is None:
        fallback = FALLBACK_ANSWER if vector_store is not None else "Backend not configured correctly (missing API keys)."

        async def fallback_gen():
            yield {"event": "token", "data": fallback}
            yield {"event": "citations", "data": json.dumps([])}
            yield {"event": "done", "data": ""}

        return EventSourceResponse(fallback_gen())

    settings = get_settings()
    retrieved = retrieve_chunks(
        vector_store=vector_store,
        question=body.question,
        top_k=settings.rag_top_k,
    )

    if not retrieved:
        async def no_chunks_gen():
            yield {"event": "token", "data": FALLBACK_ANSWER}
            yield {"event": "citations", "data": json.dumps([])}
            yield {"event": "done", "data": ""}

        return EventSourceResponse(no_chunks_gen())

    # Build citation metadata from retrieved chunks
    citations_data = []
    for idx, (doc, score) in enumerate(retrieved, start=1):
        meta = doc.metadata or {}
        page_value = meta.get("page")
        page_number = int(page_value) + 1 if isinstance(page_value, int) else None
        citations_data.append({
            "document_id": meta.get("document_id", "unknown"),
            "file_name": meta.get("file_name", "unknown"),
            "page": page_number,
            "snippet": doc.page_content[:220],
        })

    async def stream_gen():
        try:
            result = stream_answer_with_citations(body.question, retrieved)
            # Stream each token
            for token in result["tokens"]:
                yield {"event": "token", "data": token}

            # After streaming, send citations
            safe_indices = validate_citation_indices(
                result.get("citation_indices", []), len(retrieved)
            )
            final_citations = [citations_data[i - 1] for i in safe_indices if 0 < i <= len(citations_data)]
            yield {"event": "citations", "data": json.dumps(final_citations)}
            yield {"event": "done", "data": ""}
        except Exception as e:
            logger.error("Stream error: %s", e)
            yield {"event": "error", "data": str(e)}

    return EventSourceResponse(stream_gen())
