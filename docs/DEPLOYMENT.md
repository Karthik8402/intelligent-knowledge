# Deployment & CI/CD Guide

This document covers the full deployment architecture, CI/CD pipeline stages, required secrets, and rollback procedures for the **Intelligent Knowledge Base** platform.

---

## Architecture Overview

```
GitHub Push / PR
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│              GitHub Actions CI/CD Pipeline                   │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │  Backend Quality  │    │    Frontend Quality           │  │
│  │  ─────────────── │    │  ──────────────────────────  │  │
│  │  1. Ruff lint     │    │  1. ESLint / tsc typecheck   │  │
│  │  2. mypy types    │    │  2. Vitest unit tests         │  │
│  │  3. pytest + cov  │    │  3. Coverage report (v8)     │  │
│  │  4. pip-audit     │    │  4. Vite production build    │  │
│  │  5. bandit SAST   │    └──────────────────────────────┘  │
│  └──────────────────┘                │                       │
│           │                          │                       │
│           └──────────┬───────────────┘                       │
│                      ▼                                       │
│              ┌───────────────┐                               │
│              │  Smoke Tests  │                               │
│              │  (API health) │                               │
│              └───────┬───────┘                               │
│                      │  (main branch only)                   │
│           ┌──────────┴──────────┐                            │
│           ▼                     ▼                            │
│    ┌─────────────┐      ┌──────────────┐                    │
│    │ Deploy →    │      │ Deploy →     │                    │
│    │ Render      │      │ Vercel       │                    │
│    │ (Backend)   │      │ (Frontend)   │                    │
│    └─────────────┘      └──────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Pipeline Stages

| Job | Trigger | What it does |
|-----|---------|--------------|
| `backend-lint` | Every push/PR | Ruff style + import check |
| `backend-typecheck` | Every push/PR | mypy static analysis (advisory) |
| `backend-test` | After lint passes | pytest with 60% coverage gate |
| `backend-security` | After lint passes | pip-audit CVE scan + bandit SAST |
| `frontend-lint` | Every push/PR | ESLint + TypeScript type check |
| `frontend-test` | After lint passes | Vitest unit tests + v8 coverage |
| `frontend-build` | After lint passes | Vite production bundle |
| `smoke-test` | After tests + build | Live API smoke checks (health, docs, chat) |
| `deploy-backend` | `main` push only | Render deploy hook + health poll |
| `deploy-frontend` | `main` push only | Vercel CLI production deploy |
| `pipeline-summary` | Always | Markdown summary table in GitHub UI |

---

## Required GitHub Secrets

Set these in **GitHub → Settings → Secrets and Variables → Actions**:

| Secret | Used By | Description |
|--------|---------|-------------|
| `RENDER_DEPLOY_HOOK_URL` | `deploy-backend` | Render webhook URL from the service dashboard |
| `VERCEL_TOKEN` | `deploy-frontend` | Vercel personal access token |
| `VITE_API_URL` | `frontend-build` | Production backend URL (e.g. `https://intelligent-knowledge.onrender.com`) |

> **Tip**: If `RENDER_DEPLOY_HOOK_URL` is not set, the deploy step is silently skipped — safe for forks and PRs.

---

## Frontend Deployment (Vercel)

Vercel provides edge caching, global CDN, and first-class Vite support.

1. Connect your GitHub repository to Vercel.
2. Framework preset: **Vite**
3. Settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Root Directory**: `frontend`
4. Environment Variables (set in Vercel Dashboard):

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://intelligent-knowledge.onrender.com` |

The CI workflow deploys via `vercel --prod` on every merge to `main`.

---

## Backend Deployment (Render)

The backend runs as a Python web service on Render with Gunicorn + UvicornWorker.

### Render Dashboard Configuration

| Setting | Value |
|---------|-------|
| Environment | Python |
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn app.main:app --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --workers 2 --timeout 120` |
| Health Check Path | `/health` |

### Required Environment Variables (set in Render Dashboard)

| Variable | Description |
|----------|-------------|
| `GOOGLE_API_KEY` | Gemini API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon public key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (server-side only) |
| `SUPABASE_JWT_SECRET` | JWT secret for auth token validation |
| `DATABASE_URL` | Supabase Postgres connection string (for pgvector) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `STORAGE_BACKEND` | `supabase` |
| `VECTOR_STORE` | `pgvector` |
| `AUTH_ENABLED` | `true` |

These are referenced in `render.yaml` as `sync: false` (secret, not committed).

---

## Running Tests Locally

### Backend

```bash
cd backend

# Install dependencies (includes test packages)
pip install -r requirements.txt

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app --cov-report=term-missing

# Run only fast unit tests
pytest tests/ -v -m "not slow and not integration"

# Lint check
ruff check .
ruff format --check .
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:ci

# Type check
npx tsc --noEmit

# Production build
npm run build
```

---

## Rollback Procedures

### Backend (Render)

1. Go to **Render Dashboard → intelligent-knowledge → Events**
2. Find the last working deploy hash
3. Click **Rollback** next to that deployment
4. Render redeploys the previous image — typically takes ~2 minutes

### Frontend (Vercel)

1. Go to **Vercel Dashboard → intelligent-knowledge → Deployments**
2. Find the last successful deployment
3. Click **⋯ → Promote to Production**
4. Vercel instantly serves the previous build from its edge cache

---

## Monitoring

| Resource | URL |
|----------|-----|
| Backend Health | `https://intelligent-knowledge.onrender.com/health` |
| Backend Status | `https://intelligent-knowledge.onrender.com/status` |
| API Docs | `https://intelligent-knowledge.onrender.com/docs` |
| Frontend | `https://intelligent-knowledge.vercel.app` |
| Render Logs | Render Dashboard → Logs |
| Vercel Logs | Vercel Dashboard → Functions |
