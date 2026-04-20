from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .citations import validate_citation_indices
from .config import get_settings
from .generation import FALLBACK_ANSWER, get_embeddings, answer_with_citations
from .ingest import ingest_files
from .models import (
    ChatRequest,
    ChatResponse,
    Citation,
    DocumentIngestResult,
    DocumentsListResponse,
    RetrievedChunk,
)
from .retrieval import build_vector_store, retrieve_chunks
from .storage import registry

settings = get_settings()
try:
    embeddings = get_embeddings()
    vector_store = build_vector_store(embeddings)
except Exception as e:
    print(f"Warning: Vector store disabled. {e}")
    embeddings = None
    vector_store = None

app = FastAPI(title="Intelligent Knowledge Base API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/documents/upload", response_model=list[DocumentIngestResult])
def upload_documents(files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    if vector_store is None:
        raise HTTPException(status_code=500, detail="Vector store not initialized. Check API keys.")

    results = ingest_files(files, vector_store)
    return results


@app.get("/documents", response_model=DocumentsListResponse)
def list_documents():
    return {"documents": registry.list_documents()}


@app.delete("/documents/{document_id}")
def delete_document(document_id: str):
    doc = registry.get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if vector_store is not None and settings.vector_store.lower() == "chroma":
        vector_store.delete(where={"document_id": document_id})
        if hasattr(vector_store, "persist"):
            vector_store.persist()

    removed = registry.delete(document_id)

    upload_path = Path(settings.upload_dir) / doc.get("file_name", "")
    if upload_path.exists():
        upload_path.unlink(missing_ok=True)

    return {"status": "deleted", "document": removed}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    if not registry.list_documents() or vector_store is None:
        return {
            "answer": FALLBACK_ANSWER if vector_store is not None else "Backend not configured correctly (missing API keys).",
            "citations": [],
            "retrieved_chunks": [],
        }

    retrieved = retrieve_chunks(
        vector_store=vector_store,
        question=request.question,
        top_k=settings.rag_top_k,
        document_ids=request.document_ids,
    )

    if not retrieved:
        return {
            "answer": FALLBACK_ANSWER,
            "citations": [],
            "retrieved_chunks": [],
        }

    generation = answer_with_citations(request.question, retrieved)

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
