# Intelligent Knowledge Base (RAG)

A production-minded Retrieval-Augmented Generation application built from `SKILL.md`.

## What This App Does

- Upload and index PDF, TXT, DOCX, and Markdown files.
- Persist chunk embeddings in ChromaDB and metadata in a local SQLite database.
- Ask grounded questions over indexed documents with real-time SSE streaming.
- Return answers with validated citations and retrieved snippets.
- Production-ready security with CORS and Rate Limiting.
- Return a safe fallback when information is not in the uploaded context.

Fallback phrase:

`The provided documents do not contain this information.`

## Tech Stack

- Backend: FastAPI + LangChain + ChromaDB
- Frontend: React + TypeScript + Vite
- LLM: Google Gemma (default), OpenAI or Groq (optional)
- Embeddings: Google (default), OpenAI or Hugging Face (optional)

## Documentation

- Project docs index: `docs/README.md`
- Google Gemma setup: `docs/google-gemma-setup.md`
- Environment reference: `docs/environment-reference.md`
- RAG workflow: `docs/rag-workflow.md`

## Project Structure

```text
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
    App.tsx
    api.ts
    types.ts
    styles.css
  package.json
  .env.example
```

## Backend Setup

1. Create and activate a virtual environment.
2. Install dependencies:

```powershell
cd backend
pip install -r requirements.txt
```

3. Create env file:

```powershell
copy .env.example .env
```

4. Fill required secrets in `.env` (`GOOGLE_API_KEY` by default).

5. Run API:

```powershell
python -m uvicorn app.main:app --reload --port 8000
```

## Frontend Setup

1. Install packages:

```powershell
cd frontend
npm install
```

2. Configure API URL:

```powershell
copy .env.example .env
```

3. Run dev server:

```powershell
npm run dev
```

Default UI URL: `http://localhost:5173`

## API Endpoints

- `POST /documents/upload`
- `GET /documents`
- `DELETE /documents/{document_id}`
- `POST /chat`
- `GET /health`

## Notes

- `VECTOR_STORE=chroma` is the default and recommended setting.
- Metadata stored per chunk includes document ID, filename, page, chunk index, source type, and creation timestamp.
- Duplicate uploads are detected using file content hash.
- The backend validates citation indices to prevent invented source references.

## Tests

Run backend tests:

```powershell
cd backend
python -m pytest
```
