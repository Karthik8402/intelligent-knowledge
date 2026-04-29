"""Intelligent Knowledge Base API — production-grade FastAPI application."""

from __future__ import annotations

import logging
import os
import uuid
import warnings
from contextlib import asynccontextmanager

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"
warnings.filterwarnings("ignore", category=UserWarning)

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .config import get_settings
from .dependencies import set_embeddings, set_vector_store
from .exceptions import KnowledgeBaseError
from .generation import get_embeddings
from .retrieval import build_vector_store
from .routers import chat, documents, system

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | [%(request_id)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# Add a default filter so log records without request_id don't crash
class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id"):
            record.request_id = "-"  # type: ignore[attr-defined]
        return True

logging.getLogger().addFilter(RequestIdFilter())
logger = logging.getLogger("knowledge_base")

# ---------------------------------------------------------------------------
# Rate Limiter
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

# ---------------------------------------------------------------------------
# Lifespan: initialize embeddings + vector store once at startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Intelligent Knowledge Base API …")
    settings = get_settings()
    try:
        emb = get_embeddings()
        vs = build_vector_store(emb)
        set_embeddings(emb)
        set_vector_store(vs)
        logger.info("Vector store (%s) initialized successfully", settings.vector_store)
    except Exception as e:
        logger.warning("Vector store disabled: %s", e)
        set_embeddings(None)
        set_vector_store(None)

    yield  # app is running

    logger.info("Shutting down …")


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Intelligent Knowledge Base API",
    description="Production-grade RAG-powered document Q&A system with multi-LLM support.",
    version="2.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter

# ── CORS ──
settings = get_settings()
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Middleware: Request ID + structured logging
# ---------------------------------------------------------------------------
@app.middleware("http")
async def request_id_middleware(request: Request, call_next) -> Response:
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
    request.state.request_id = request_id

    # Thread the request_id into all log records during this request
    log_extra = {"request_id": request_id}
    old_factory = logging.getLogRecordFactory()

    def record_factory(*args, **kwargs):
        record = old_factory(*args, **kwargs)
        record.request_id = request_id  # type: ignore[attr-defined]
        return record

    logging.setLogRecordFactory(record_factory)

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id

    logging.setLogRecordFactory(old_factory)
    return response


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------
@app.exception_handler(KnowledgeBaseError)
async def knowledge_base_exception_handler(request: Request, exc: KnowledgeBaseError):
    logger.error("KnowledgeBaseError: %s (status=%d)", exc.message, exc.status_code)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.message},
    )


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    logger.warning("Rate limit exceeded: %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=429,
        content={"error": "Too many requests. Please slow down.", "retry_after": str(exc.detail)},
    )


# ---------------------------------------------------------------------------
# Register routers
# ---------------------------------------------------------------------------
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(system.router)
