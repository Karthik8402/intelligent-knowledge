"""System routes: health (public), status/settings (secured)."""

from __future__ import annotations

import logging
import platform
import shutil
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends

from ..config import get_settings
from ..core.auth import UserContext, get_current_user, get_optional_user
from ..dependencies import get_embeddings_instance, get_registry, get_vector_store_optional
from ..models import SettingsResponse, SettingsUpdate, StatusResponse

logger = logging.getLogger(__name__)
router = APIRouter(tags=["system"])

_start_time = time.time()


@router.get("/health")
def health(
    vector_store: Any = Depends(get_vector_store_optional),
    embeddings: Any = Depends(get_embeddings_instance),
) -> dict:
    """Deep health check — remains public for load balancers and uptime monitors."""
    settings = get_settings()

    checks = {
        "vector_store": vector_store is not None,
        "embeddings": embeddings is not None,
    }

    # Only check disk space in local mode
    if settings.storage_backend == "local":
        data_dir = Path(settings.upload_dir).parent
        disk = shutil.disk_usage(str(data_dir))
        disk_free_mb = disk.free / (1024 * 1024)
        checks["disk_space_ok"] = disk_free_mb > 100
    else:
        disk_free_mb = -1  # Not applicable for cloud storage

    overall = all(checks.values())

    return {
        "status": "healthy" if overall else "degraded",
        "timestamp": datetime.now(UTC).isoformat(),
        "uptime_seconds": round(time.time() - _start_time),
        "version": "3.0.0",
        "python_version": platform.python_version(),
        "storage_backend": settings.storage_backend,
        "vector_store": settings.vector_store,
        "auth_enabled": settings.auth_enabled,
        "checks": checks,
    }


@router.get("/status", response_model=StatusResponse)
def get_status(
    vector_store: Any = Depends(get_vector_store_optional),
    embeddings: Any = Depends(get_embeddings_instance),
    reg=Depends(get_registry),
    user: UserContext = Depends(get_current_user),
):
    """System status — requires authentication."""
    docs = reg.list_documents(owner_id=user.user_id)
    doc_count = len(docs)
    chunk_count = sum(doc.get("chunks", 0) for doc in docs)
    settings = get_settings()

    return StatusResponse(
        vector_store=settings.vector_store,
        llm_provider=settings.llm_provider,
        store_initialized=vector_store is not None,
        embeddings_loaded=embeddings is not None,
        documents=doc_count,
        chunks=chunk_count,
    )


@router.get("/settings", response_model=SettingsResponse)
def get_current_settings(
    user: UserContext = Depends(get_current_user),
):
    """Get current settings — requires authentication."""
    settings = get_settings()
    return SettingsResponse(
        rag_top_k=settings.rag_top_k,
        llm_provider=settings.llm_provider,
        vector_store=settings.vector_store,
    )


@router.put("/settings")
def update_settings(
    updates: SettingsUpdate,
    user: UserContext = Depends(get_current_user),
):
    """Update settings in memory — requires authentication."""
    settings = get_settings()

    # Apply in-memory updates (does not persist to .env)
    if updates.rag_top_k is not None:
        settings.rag_top_k = updates.rag_top_k
    if updates.llm_provider is not None:
        settings.llm_provider = updates.llm_provider
    if updates.vector_store is not None:
        settings.vector_store = updates.vector_store

    logger.info(
        "Settings updated by user=%s: top_k=%d, llm=%s, vs=%s",
        user.user_id,
        settings.rag_top_k,
        settings.llm_provider,
        settings.vector_store,
    )

    return {
        "status": "updated_in_memory",
        "settings": SettingsResponse(
            rag_top_k=settings.rag_top_k,
            llm_provider=settings.llm_provider,
            vector_store=settings.vector_store,
        ),
    }
