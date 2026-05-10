# Quick Knowledge — Intelligent Knowledge Base

A production-minded Retrieval-Augmented Generation (RAG) application for grounded document Q&A. Upload files, index them into a vector store, and ask questions with validated citations and real-time streaming responses. Built with FastAPI, React, LangGraph, and Supabase.

## What This App Does

- **Upload & Ingest** — Drag-and-drop PDF, TXT, DOCX, and Markdown files. Duplicate uploads are detected via content hash.
- **Vector Indexing** — Documents are split into chunks, embedded, and stored in ChromaDB (local) or Supabase pgvector (production).
- **Grounded Q&A** — Ask questions in natural language. The system retrieves relevant chunks, grades them for relevance (self-RAG), and generates an answer with citations.
- **Real-Time Streaming** — Chat responses stream via Server-Sent Events (SSE) for a fluid UX.
- **Multi-Modal Support** — Toggle between Google, OpenAI, NVIDIA, and Groq LLMs at runtime.
- **Secure by Default** — CORS, rate limiting, JWT auth, prompt injection detection, and hardened security headers.
- **Safe Fallbacks** — When no relevant context is found, the system responds with a controlled fallback instead of hallucinating.

> **Fallback phrase:** `The provided documents do not contain this information.`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router DOM v7, Framer Motion |
| **Backend** | FastAPI, Python 3.12, Pydantic Settings |
| **RAG / LLM** | LangChain, LangGraph, Google Gemini/Gemma, OpenAI, NVIDIA AI, Groq |
| **Embeddings** | Google `gemini-embedding-001` (default), OpenAI, Hugging Face |
| **Vector Store** | ChromaDB (dev), Supabase pgvector (prod) |
| **Storage** | Local filesystem (dev), Supabase Storage (prod) |
| **Auth** | Supabase Auth (JWT) — optional in development, enforced in production |
| **Testing** | Vitest + React Testing Library (frontend), pytest (backend) |
| **Deployment** | Render (backend Docker), Vercel (frontend), Supabase (DB / storage / auth) |

---

## Architecture Overview

```
┌─────────────┐      REST / SSE       ┌─────────────────────────────────────┐
│  React SPA  │ ◄──────────────────►  │           FastAPI Backend           │
│  (Vercel)   │                       │  ┌─────────┐ ┌─────────┐ ┌───────┐  │
└─────────────┘                       │  │ Upload  │ │  Chat   │ │System │  │
       │                              │  │ Service │ │ Service │ │Routes │  │
       │ Supabase Auth (JWT)          │  └────┬────┘ └────┬────┘ └───────┘  │
       ▼                              │       │           │                 │
┌─────────────┐                       │  ┌────▼───────────▼────┐            │
│  Supabase   │ ◄─────────────────────┼──►  LangGraph RAG      │            │
│  (Auth/DB)  │    user_id / RLS      │     Retrieve → Grade   │            │
└─────────────┘                       │     → Generate         │            │
                                      │  └─────────────────────┘            │
                                      │       │                             │
                                      │  ┌────▼────┐    ┌─────────────┐      │
                                      │  │ Vector  │◄──►│  ChromaDB   │      │
                                      │  │ Store   │    │  (or pgvector│      │
                                      │  └─────────┘    └─────────────┘      │
                                      └─────────────────────────────────────┘
```

### RAG Agent Pipeline (LangGraph)

1. **Retrieve** — Fetch top-k chunks from the vector store using similarity search.
2. **Grade** — Filter chunks by a relevance threshold (≥ 0.3). This self-RAG step prevents the LLM from seeing irrelevant context.
3. **Generate** — Produce a grounded answer with validated citations. If no chunks pass grading, the pipeline returns the fallback immediately—saving API costs.

---

## Project Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI factory + middleware
│   │   ├── config.py               # Pydantic settings
│   │   ├── api/v1/api.py           # API router aggregator
│   │   ├── api/v1/endpoints/       # Route handlers (chat, documents, system)
│   │   ├── services/               # Business logic (chat_service, document_service)
│   │   ├── agents/graph.py         # LangGraph RAG pipeline
│   │   ├── core/                   # Auth, dependency injection, exceptions
│   │   ├── schemas/                # Pydantic request/response models
│   │   ├── generation.py           # LLM wrapper + answer builder
│   │   ├── retrieval.py            # Vector store builder
│   │   ├── ingest.py               # Document parsing + chunking
│   │   ├── citations.py            # Citation validation
│   │   └── storage.py              # Local / Supabase storage adapters
│   ├── tests/                      # 12+ pytest suites
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile                  # (deployed via repo root)
├── frontend/
│   ├── src/
│   │   ├── pages/                  # Home, SettingsPage, StatusPage
│   │   ├── features/               # Domains: auth, chat, documents
│   │   ├── components/             # Layout, shared UI primitives
│   │   ├── hooks/                  # useAuth
│   │   ├── api.ts                  # Axios/fetch wrapper
│   │   ├── types.ts                # Shared TypeScript types
│   │   ├── store/                  # (extensible state layer)
│   │   └── __tests__/              # Vitest suites
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── .env.example
├── supabase/
│   └── migrations/                 # SQL migrations for pgvector / tables
├── docs/
│   ├── google-gemma-setup.md
│   ├── environment-reference.md
│   └── rag-workflow.md
├── Dockerfile                      # Multi-stage production image
└── render.yaml                     # Render Blueprint (IaC)
```

---

## Prerequisites

- **Python** ≥ 3.12
- **Node.js** ≥ 20
- **Git**
- (Optional) **Supabase** account for production features

---

## Backend Setup

```powershell
cd backend

# 1. Create virtual environment
python -m venv venv
.\venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
copy .env.example .env
# Edit .env: set GOOGLE_API_KEY (or another provider key)

# 4. Run development server
python -m uvicorn app.main:app --reload --port 8000
```

### Production Server

```powershell
cd backend
gunicorn app.main:app --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --workers 2 --timeout 120
```

**API docs (auto-generated):** `http://localhost:8000/docs`

---

## Frontend Setup

```powershell
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
copy .env.example .env
# Edit .env: VITE_API_BASE_URL=http://localhost:8000

# 3. Run development server
npm run dev
```

Default UI: `http://localhost:5173`

### Build for Production

```powershell
cd frontend
npm run build
```

Static output is emitted to `frontend/dist/` and can be served by Vercel, Nginx, etc.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `google` | google / openai / nvidia / groq |
| `LLM_MODEL` | `gemma-3-27b-it` | Model identifier |
| `GOOGLE_API_KEY` | *(required)* | API key for Google AI |
| `EMBEDDING_PROVIDER` | `google` | google / openai / huggingface |
| `EMBEDDING_MODEL` | `gemini-embedding-001` | Embedding model identifier |
| `STORAGE_BACKEND` | `local` | `local` (dev) or `supabase` (prod) |
| `VECTOR_STORE` | `chroma` | `chroma` (dev) or `pgvector` (prod) |
| `AUTH_ENABLED` | `false` | `true` in production when using Supabase Auth |
| `SUPABASE_*` | — | Required when `STORAGE_BACKEND=supabase` |
| `DATABASE_URL` | — | Postgres connection string for pgvector |
| `RATE_LIMIT` | `10/minute` | Per-IP rate limit |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |

See `docs/environment-reference.md` for the complete variable reference.

### Frontend (`frontend/.env`)

| Variable | Example | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend API origin |

---

## API Endpoints

### Documents
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/documents/upload` | Yes | Upload PDF / TXT / DOCX / MD files |
| `GET`  | `/documents` | Yes | List uploaded documents |
| `DELETE`| `/documents/{id}` | Yes | Remove document + vectors |
| `GET`  | `/documents/{id}/chunks` | Yes | Inspect indexed chunks |

### Chat
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/chat` | Yes | Ask a question — returns JSON with citations |
| `POST` | `/chat/stream` | Yes | Streaming Q&A via SSE |

### System
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | No | Deep health check (disk, vectors, embeddings) |
| `GET` | `/status` | Yes | Document / chunk counts, provider status |
| `GET` | `/settings` | Yes | View active runtime settings |
| `PUT` | `/settings` | Yes | Update settings in memory |

---

## Deployment

### Render (Backend)

1. Push this repo to GitHub.
2. In Render, create a **Blueprint** and point it at `render.yaml`.
3. Set secret values in the Render Dashboard (`GOOGLE_API_KEY`, `SUPABASE_*`, `DATABASE_URL`, `CORS_ORIGINS`).
4. Render builds the Docker image and deploys the FastAPI service.

> The included `Dockerfile` runs a non-root user, exposes port `8000`, and uses `gunicorn` + `uvicorn` workers with a health check.

### Vercel (Frontend)

1. Import the `frontend/` directory into a new Vercel project (or deploy the whole repo and set the root directory to `frontend`).
2. Set the environment variable `VITE_API_BASE_URL` to your Render backend URL.
3. Deploy — Vercel builds with `npm run build` automatically.

### Supabase (Production Dependencies)

Required when `STORAGE_BACKEND=supabase` and `AUTH_ENABLED=true`:

- **Auth** — Supabase Auth with JWT validation on every protected route.
- **Storage** — File uploads go to a Supabase Storage bucket (`documents`).
- **Postgres + pgvector** — Chunk embeddings stored in a vector-enabled table (`pgvector`).

Run migrations in `supabase/migrations/` to set up tables and extensions.

---

## CI/CD Pipeline

This project includes a comprehensive GitHub Actions CI/CD pipeline that automatically runs on every push and pull request:

### Quality Gates (CI)
- **Backend** — Linting (Ruff), Type Checking (MyPy), Security Scanning (Bandit), Unit Tests (Pytest)
- **Frontend** — Linting (ESLint), Type Checking (TypeScript), Unit Tests (Vitest)
- **Smoke Tests** — API health and endpoint validation

### Deployment (CD)
- **Frontend** — Automatically deployed to Vercel on `main` branch pushes
- **Backend** — Automatically deployed to Render on `main` branch pushes

### Pipeline Configuration

The pipeline is defined in `.github/workflows/ci-cd.yml` with the following jobs:

1. **Backend Quality Gates** — Lint, Type Check, Tests, Security Scan
2. **Frontend Quality Gates** — Lint, Tests, Build
3. **Smoke Tests** — API endpoint validation
4. **Deployments** — Vercel (frontend) and Render (backend) deployments

### Environment Variables

For deployments to work properly, you need to set the following secrets in your GitHub repository:

- `VERCEL_TOKEN` — Vercel access token for programmatic deployments
- `RENDER_DEPLOY_HOOK_URL` — Render deployment hook URL for backend deployment
- `VITE_API_BASE_URL` — The production backend URL for frontend API calls

### Pipeline Status

[![CI/CD Pipeline](https://github.com/your-username/intelligent-knowledge/actions/workflows/ci-cd.yml/badge/CI-CD%20Pipeline)](https://github.com/your-username/intelligent-knowledge/actions/workflows/ci-cd.yml)

---

## Testing

### Backend

```powershell
cd backend
python -m pytest
```

Suites cover: API routes, auth, chat service, citations, config, document service, fallback behavior, generation, ingestion, retrieval, and storage.

### Frontend

```powershell
cd frontend
npm run test        # run once
npm run test:watch  # watch mode
npm run test:ci     # with coverage report
```

---

## Security Features

- **Rate Limiting** — Per-IP rate limiting with `slowapi` (configurable via `RATE_LIMIT`).
- **CORS** — Origin whitelist with credential support.
- **Security Headers** — `X-Content-Type-Options`, `X-Frame-Options`, `CSP`, `Permissions-Policy`, and more.
- **Request IDs** — Every request is tagged with an `X-Request-ID` for traceability.
- **Prompt Injection Guard** — Chat input is scanned for jailbreak patterns; blocked requests return a safe response.
- **JWT Authentication** — Optional in local development, enforced in production via Supabase Auth tokens.
- **Citation Validation** — Backend validates that every citation index maps to a real retrieved chunk.

---

## Documentation

- `docs/README.md` — Documentation index
- `docs/environment-reference.md` — Complete environment variable reference
- `docs/rag-workflow.md` — End-to-end ingestion, retrieval, and generation flow
- `docs/google-gemma-setup.md` — Configuring Google Gemma models

---

## Notes

- `VECTOR_STORE=chroma` is the default for local development.
- `VECTOR_STORE=pgvector` and `STORAGE_BACKEND=supabase` are recommended for production.
- The LangGraph pipeline is executed synchronously per request; it can be upgraded to an async `StateGraph` for parallel branches.
- Settings updates via `PUT /settings` are applied in memory and do **not** persist to `.env`.

---

## License

[MIT](LICENSE) — feel free to fork and adapt for your own knowledge base.
