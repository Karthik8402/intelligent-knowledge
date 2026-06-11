"""User-specific data endpoints: sessions, activity feed, notifications.

All endpoints are protected by get_current_user.
Sessions: derived from document registry + auth context.
Activity: document-upload event log from the registry.
Notifications: computed from live system state (not stored).
"""

from __future__ import annotations

from datetime import UTC, datetime
import logging
from typing import Any

from fastapi import APIRouter, Depends

from app.config import get_settings
from app.core.auth import UserContext, get_current_user
from app.dependencies import get_registry, get_vector_store_optional
from app.services.usage_service import UsageService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/user", tags=["user-data"])


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------


@router.get("/sessions")
def get_sessions(
    user: UserContext = Depends(get_current_user),
    reg=Depends(get_registry),
) -> dict[str, Any]:
    """Return session metadata for the current user.

    Since the backend does not hold Supabase session tokens, this endpoint
    derives session context from what is knowable server-side:
    - The current authenticated request represents an active session.
    - Last activity is inferred from the most recently uploaded document.
    - Account creation is inferred from the oldest document's created_at.
    """
    settings = get_settings()
    docs = reg.list_documents(owner_id=user.user_id)

    # Infer last activity from most recent document, fallback to None
    sorted_docs = sorted(
        docs,
        key=lambda d: d.get("created_at") or "1970-01-01T00:00:00",
        reverse=True,
    )
    last_activity = sorted_docs[0].get("created_at") if sorted_docs else None

    # Infer account first seen from oldest document
    oldest = sorted(
        docs,
        key=lambda d: d.get("created_at") or "1970-01-01T00:00:00",
    )
    first_seen = oldest[0].get("created_at") if oldest else None

    # Current session — always present (the caller IS in a session right now)
    is_anonymous = user.user_id == "anonymous"
    current_session = {
        "session_id": "current",
        "is_current": True,
        "status": "active",
        "user_id": user.user_id,
        "is_anonymous": is_anonymous,
        "auth_backend": settings.storage_backend,
        "last_activity": last_activity,
        "first_seen": first_seen,
        "document_count": len(docs),
        "created_at": datetime.now(UTC).isoformat(),
    }

    return {
        "sessions": [current_session],
        "total": 1,
        "active_count": 1,
        "note": (
            "Session management is handled by Supabase Auth. "
            "Use your Supabase dashboard to revoke sessions."
        ),
    }


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------


def _build_notifications(
    user: UserContext,
    doc_count: int,
    store_initialized: bool,
    usage: dict[str, Any] | None,
) -> list[dict[str, Any]]:
    """Compute the live notification list from system state.

    Notifications are purely derived — they are NOT stored.
    Order: critical → warning → info → onboarding.
    """
    notifications: list[dict[str, Any]] = []
    now = datetime.now(UTC).isoformat()

    # 1. Vector store not initialized (critical — system unusable)
    if not store_initialized:
        notifications.append(
            {
                "id": "sys-store-not-init",
                "type": "critical",
                "icon": "error",
                "title": "Knowledge Base Not Ready",
                "body": (
                    "The vector store has not been initialised. "
                    "Upload at least one document to activate the RAG pipeline."
                ),
                "timestamp": now,
                "dismissible": False,
                "action": {"label": "Upload Document", "href": "/documents"},
            }
        )

    # 2. Usage quota notifications (only if usage data available)
    if usage is not None:
        pct = usage.get("percentage", 0)
        used = usage.get("used", 0)
        limit = usage.get("limit", 50)

        if pct >= 100:
            notifications.append(
                {
                    "id": "usage-critical",
                    "type": "critical",
                    "icon": "block",
                    "title": "AI Query Limit Reached",
                    "body": (
                        f"You have used all {limit} AI queries for this period. "
                        "New queries are blocked until the quota resets."
                    ),
                    "timestamp": now,
                    "dismissible": False,
                    "action": {"label": "View Usage", "href": "/analytics"},
                }
            )
        elif pct >= 80:
            notifications.append(
                {
                    "id": "usage-warning",
                    "type": "warning",
                    "icon": "warning",
                    "title": "AI Usage Approaching Limit",
                    "body": (
                        f"You have used {used} of {limit} AI queries "
                        f"({pct:.0f}%). Consider your usage before the quota resets."
                    ),
                    "timestamp": now,
                    "dismissible": True,
                    "action": {"label": "View Analytics", "href": "/analytics"},
                }
            )

    # 3. Onboarding — no documents yet
    if doc_count == 0:
        notifications.append(
            {
                "id": "onboarding-upload",
                "type": "info",
                "icon": "upload_file",
                "title": "Get Started: Upload Your First Document",
                "body": ("Upload a PDF, text file, or URL to begin querying your knowledge base."),
                "timestamp": now,
                "dismissible": True,
                "action": {"label": "Upload Document", "href": "/documents"},
            }
        )

    # 4. Welcome notification for new users (only if no docs)
    if doc_count == 0 and user.user_id != "anonymous":
        notifications.append(
            {
                "id": "welcome",
                "type": "info",
                "icon": "celebration",
                "title": "Welcome to Intelligent Knowledge",
                "body": (
                    "Your account is set up. Start by uploading documents "
                    "to build your knowledge base."
                ),
                "timestamp": now,
                "dismissible": True,
                "action": None,
            }
        )

    return notifications


@router.get("/notifications")
def get_notifications(
    user: UserContext = Depends(get_current_user),
    reg=Depends(get_registry),
    vector_store: Any = Depends(get_vector_store_optional),
) -> dict[str, Any]:
    """Return computed notifications for the current user.

    Notifications are derived from live system state — not persisted.
    This means they reappear after page refresh until conditions clear.
    Dismissal is handled client-side only.
    """
    docs = reg.list_documents(owner_id=user.user_id)
    doc_count = len(docs)
    store_initialized = vector_store is not None

    # Safely fetch usage — never crash the notifications endpoint
    usage: dict[str, Any] | None = None
    try:
        usage = UsageService.get_usage(user.user_id)
    except Exception:
        logger.warning("Failed to fetch usage for notifications (user=%s)", user.user_id)

    notifications = _build_notifications(user, doc_count, store_initialized, usage)

    return {
        "notifications": notifications,
        "total": len(notifications),
        "unread_count": len(notifications),
    }
