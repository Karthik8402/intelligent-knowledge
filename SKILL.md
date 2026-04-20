---
name: intelligent-knowledge-base
description: Build or improve a Retrieval-Augmented Generation knowledge-base project where users upload documents, index them into a vector store, and chat with grounded answers and citations. Use when Codex is asked to create a RAG app, document Q&A system, PDF chatbot, local knowledge base, citation-based assistant, LangChain pipeline, ChromaDB/FAISS retrieval project, React TypeScript frontend for document chat, or Gemini/Gemma-powered answer generation over uploaded files.
---

# Intelligent Knowledge Base

Create a production-minded Retrieval-Augmented Generation (RAG) web application that lets users upload documents, indexes their content, and answers questions using only retrieved document context with explicit citations.

## Target Outcome

Build a working application where a user can:

1. Upload one or more documents such as PDF, TXT, DOCX, or Markdown files.
2. See ingestion status, document names, page counts, chunk counts, and any parsing errors.
3. Ask a natural-language question about the uploaded documents.
4. Receive an answer grounded only in retrieved context.
5. See citations for every substantive claim, including file name and page or section when available.
6. Get a clear fallback answer when the documents do not contain the requested information.

Example behavior:

User: `What is the warranty policy for the X1 model?`

Assistant: `The X1 model has a 2-year limited warranty covering manufacturing defects. (Source: X1_Manual.pdf, page 12)`

If the answer is not present:

Assistant: `The provided documents do not contain this information.`

## Preferred Stack

Use the user's requested stack when provided. If the request is open-ended, prefer:

- Frontend: React with TypeScript
- Backend: Python FastAPI
- RAG orchestration: LangChain or LangGraph when it adds value
- Vector database: ChromaDB for local persistence; FAISS for simple in-memory/local experiments
- LLM: Gemini or Gemma if requested; otherwise choose a configurable provider boundary
- Embeddings: match the LLM provider when practical, or use a local Hugging Face embedding model for local-first builds
- Document parsing: PyPDFLoader or pypdf for PDF, TextLoader for TXT/Markdown, python-docx or Unstructured for DOCX

Do not hard-code secrets or API keys. Read them from environment variables and include a `.env.example` when creating a project.

## Project Shape

For a full-stack project, create a structure similar to:

```text
project-root/
  backend/
    app/
      main.py
      config.py
      models.py
      ingest.py
      retrieval.py
      generation.py
      citations.py
      storage.py
    tests/
    requirements.txt
    .env.example
  frontend/
    src/
      components/
      lib/
      pages/ or app/
      types/
    package.json
  README.md
```

Adapt the structure to the existing repository. If the repo already has a framework, follow its conventions instead of forcing this layout.

## Implementation Workflow

### 1. Inspect Existing Context

Before editing, identify:

- Current framework, package manager, and app entry points
- Whether a backend already exists
- Existing UI conventions, routing, state management, and styling
- Current environment variable patterns
- Test framework and build commands

Use `rg`, `rg --files`, and package/config files to find these quickly.

### 2. Define the RAG Contract

Create a clear contract between the UI, backend, and retrieval pipeline.

Minimum API endpoints:

- `POST /documents/upload`: accept one or more files and return document IDs plus ingestion status
- `GET /documents`: list indexed documents and metadata
- `DELETE /documents/{document_id}`: remove a document and its vectors when supported
- `POST /chat`: accept a question and optional document filters, return answer, citations, and retrieved snippets

Minimum chat response shape:

```json
{
  "answer": "string",
  "citations": [
    {
      "document_id": "string",
      "file_name": "manual.pdf",
      "page": 12,
      "snippet": "short relevant excerpt"
    }
  ],
  "retrieved_chunks": [
    {
      "document_id": "string",
      "file_name": "manual.pdf",
      "page": 12,
      "score": 0.82,
      "text": "chunk text"
    }
  ]
}
```

### 3. Build Document Ingestion

Implement ingestion as a deterministic pipeline:

1. Validate file type and size.
2. Save the uploaded file or stream it to a controlled storage location.
3. Extract text while preserving metadata.
4. Split text into chunks.
5. Generate embeddings.
6. Store vectors with metadata.
7. Return ingestion results and errors per document.

Preserve this metadata for every chunk:

- `document_id`
- `file_name`
- `page` or section identifier when available
- `chunk_index`
- `source_type`
- `created_at`

Use stable document IDs rather than raw file names. Avoid duplicate indexing when the same file is uploaded repeatedly; use a content hash if practical.

### 4. Tune Chunking

Start with conservative defaults:

- `chunk_size`: 800 to 1200 characters or equivalent tokens
- `chunk_overlap`: 120 to 250 characters
- Splitter: `RecursiveCharacterTextSplitter`

Prefer paragraph and sentence boundaries where possible. Avoid splitting tables, headings, and list items so aggressively that citations become meaningless.

Expose chunk size, overlap, and top-k as configuration values rather than burying them in business logic.

### 5. Implement Retrieval

Use similarity search with metadata filters.

Default retrieval behavior:

- Retrieve top 4 to 6 chunks.
- Include document filters when the user selects specific files.
- Return retrieval scores when the vector store supports them.
- Keep retrieved snippets short enough for UI display.

Consider adding MMR retrieval when answers become repetitive or top results are too similar.

### 6. Implement Grounded Generation

The generation prompt must require strict context adherence.

Use a system instruction with these rules:

```text
Answer using only the provided context.
If the context does not contain the answer, say: "The provided documents do not contain this information."
Do not use outside knowledge.
Include citations for claims using the provided source metadata.
Do not invent file names, page numbers, sections, dates, or numbers.
```

Pass retrieved chunks to the model with clear source labels:

```text
[Source 1]
file: X1_Manual.pdf
page: 12
text: ...
```

Prefer structured output when the model/provider supports it, so citations are easier to validate.

### 7. Validate Citations

After generation, verify that citations refer to retrieved chunks.

Do not allow the final response to cite:

- A file that was not retrieved
- A page that is missing from metadata
- A source number that does not exist
- A snippet unrelated to the answer

If citation validation fails, either repair using retrieved metadata or return a safer fallback.

### 8. Build the Frontend Experience

The first screen should be the usable document chat interface, not a marketing landing page.

Include:

- File upload area with progress and error states
- Document list with indexed status, file names, and delete controls
- Chat panel with question input
- Answer display with citations
- Expandable source snippets
- Empty state for no documents
- Loading states for upload, indexing, and answer generation

Use React TypeScript types matching backend responses. Keep the UI practical and information-dense enough for document work.

### 9. Handle Errors Clearly

Implement user-visible and developer-useful errors for:

- Unsupported file types
- Empty or unreadable documents
- Failed embedding generation
- Missing API keys
- Vector store initialization failure
- No documents indexed
- No relevant chunks retrieved
- LLM provider errors

Do not expose secret values or raw stack traces in the frontend.

### 10. Add Tests and Verification

Add tests proportional to the project size.

High-value backend tests:

- Text splitting preserves metadata
- Upload rejects unsupported files
- Retrieval returns chunks with source metadata
- Generation fallback triggers when context is empty
- Citation validation rejects invented citations

High-value frontend checks:

- Upload UI renders
- Chat request displays answer and citations
- Error state displays for failed upload or chat

Before finishing, run the relevant checks available in the repo, such as:

- Backend tests
- Frontend typecheck
- Frontend build
- Linting if configured

If a dev server is appropriate, start it and provide the local URL.

## Configuration

Use environment variables for provider and storage settings.

Common variables:

```text
LLM_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=
EMBEDDING_PROVIDER=
EMBEDDING_MODEL=
CHROMA_PERSIST_DIR=./data/chroma
UPLOAD_DIR=./data/uploads
RAG_TOP_K=5
RAG_CHUNK_SIZE=1000
RAG_CHUNK_OVERLAP=200
```

Use sensible defaults for non-secret values. Fail early with a clear message when required secrets are missing.

## Quality Bar

The project is complete when:

- A user can upload supported files.
- The backend indexes documents into the vector store.
- The user can ask questions from the UI.
- Answers are based only on retrieved chunks.
- Citations are visible and traceable to uploaded files.
- The app handles missing information honestly.
- Configuration is documented with `.env.example`.
- The main build/test commands pass or any blockers are clearly reported.

## Common Pitfalls

Avoid these mistakes:

- Mixing Streamlit-only state patterns into a React/FastAPI project.
- Returning uncited answers for document-specific questions.
- Dropping page metadata during chunking.
- Letting the model cite sources it did not receive.
- Re-embedding all documents on every chat request.
- Storing API keys in source code.
- Building only a backend demo when the user asked for a complete app.
- Creating a landing page instead of the actual upload-and-chat workflow.
- Silently ignoring failed files during multi-document upload.

## When Updating an Existing Project

Make the smallest useful change that moves the project toward the RAG outcome.

Prioritize in this order:

1. Fix broken setup, imports, or configuration.
2. Make ingestion reliable.
3. Preserve metadata and citations.
4. Improve retrieval quality.
5. Improve UI states and source display.
6. Add tests around the changed behavior.

Respect existing architecture and do not replace frameworks unless the user explicitly asks.
