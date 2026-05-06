"""Supabase client singleton and storage helpers."""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any

from ..config import get_settings

logger = logging.getLogger(__name__)


@lru_cache
def get_supabase_client():
    """Return an authenticated Supabase admin client (server-side)."""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY are required when STORAGE_BACKEND=supabase"
        )

    from supabase import create_client

    client = create_client(settings.supabase_url, settings.supabase_service_key)
    logger.info("Supabase client initialized for %s", settings.supabase_url)
    return client


def upload_file_to_storage(
    file_bytes: bytes,
    file_name: str,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload a file to Supabase Storage and return its public path."""
    settings = get_settings()
    client = get_supabase_client()
    bucket = settings.supabase_storage_bucket

    # Upload (upsert to overwrite if exists)
    path = f"uploads/{file_name}"
    client.storage.from_(bucket).upload(
        path=path,
        file=file_bytes,
        file_options={"content-type": content_type, "upsert": "true"},
    )
    logger.info("Uploaded %s to Supabase Storage bucket '%s'", path, bucket)
    return path


def delete_file_from_storage(file_name: str) -> None:
    """Delete a file from Supabase Storage."""
    settings = get_settings()
    client = get_supabase_client()
    bucket = settings.supabase_storage_bucket

    path = f"uploads/{file_name}"
    try:
        client.storage.from_(bucket).remove([path])
        logger.info("Deleted %s from Supabase Storage", path)
    except Exception as e:
        logger.warning("Failed to delete %s from Storage: %s", path, e)


def get_db_connection_string() -> str:
    """Return the Postgres connection string for pgvector / direct queries."""
    settings = get_settings()
    if not settings.database_url:
        raise ValueError("DATABASE_URL is required when using Supabase/pgvector")
    return settings.database_url
