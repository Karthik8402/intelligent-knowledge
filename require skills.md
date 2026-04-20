# Required Skills Analysis & Implementation

This document outlines the results of the project analysis, detailing the found issues and inconsistencies within the "Intelligent Knowledge Base" RAG project.

## Discovered Issues & Inconsistencies

### 1. JSON Parsing Defect (Generation Layer)
**Issue**: In `backend/app/generation.py`, the LLM response is processed with a raw `json.loads(content)`. However, LLMs (including those requested via Langchain) frequently wrap JSON outputs in Markdown code blocks (e.g., ` ```json { ... } ``` `). 
**Inconsistency**: A `JSONDecodeError` here triggers the fail-safe, hiding the actual answer behind `The provided documents do not contain this information.` This makes the RAG system look unresponsive when it actually found the answer.

### 2. FAISS Persistence Inconsistency (Retrieval Layer)
**Issue**: In `backend/app/retrieval.py`, the `FAISS` vector store is re-initialized with `["bootstrap"]` on every server restart. However, the document metadata is persisted in `document_registry.json`.
**Inconsistency**: When the application restarts, the UI still lists uploaded documents (from the registry), but their vectorized chunks are permanently lost. Any new queries will fail or just retrieve "bootstrap" strings, representing a major data management inconsistency.

### 3. API Key Initialization Crash (Setup Layer)
**Issue**: `backend/app/main.py` globally instantiates `get_embeddings()` at the start of the module.
**Inconsistency**: The server fails to even start `uvicorn` if the `GOOGLE_API_KEY` is not present yet (since it raises a `ValueError` immediately upon module load). The backend should crash at inference time or gracefully complain, allowing developers to at least boot up and see the `/health` checks.

### 4. Citation Validation Inflexibility (Models Layer)
**Issue**: `backend/app/citations.py` drops any citation indices that are not technically `int` types (`isinstance(idx, int)`).
**Inconsistency**: While we ask the model to generate integers, if the LLM generates string versions (e.g., `"1"` instead of `1`), they are silently discarded, stripping otherwise valid citations from the answer. 

## Plan for Implementation
These will be patched immediately to harmonize the RAG expectations with actual runtime performance.
