"""JWT verification and user context for Supabase Auth."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..config import get_settings

logger = logging.getLogger(__name__)

# FastAPI security scheme — extracts Bearer token from Authorization header
_bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class UserContext:
    """Authenticated user extracted from a Supabase JWT."""
    user_id: str
    email: str
    role: str = "authenticated"


def verify_jwt(token: str) -> dict:
    """Decode and verify a Supabase JWT. Returns the payload dict."""
    settings = get_settings()
    if not settings.supabase_jwt_secret:
        raise ValueError("SUPABASE_JWT_SECRET is required when AUTH_ENABLED=true")

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e}",
        )


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> UserContext:
    """FastAPI dependency: extract and verify the user from the request.

    When AUTH_ENABLED=false, returns a default anonymous user so the app
    works without Supabase during local development.
    """
    settings = get_settings()

    if not settings.auth_enabled:
        return UserContext(user_id="anonymous", email="dev@localhost", role="admin")

    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_jwt(credentials.credentials)

    user_id = payload.get("sub", "")
    email = payload.get("email", "")
    role = payload.get("role", "authenticated")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user identity (sub)",
        )

    return UserContext(user_id=user_id, email=email, role=role)


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> Optional[UserContext]:
    """Like get_current_user but returns None instead of raising on missing auth.
    Useful for public endpoints that optionally personalize for logged-in users.
    """
    settings = get_settings()

    if not settings.auth_enabled:
        return UserContext(user_id="anonymous", email="dev@localhost", role="admin")

    if credentials is None or not credentials.credentials:
        return None

    try:
        payload = verify_jwt(credentials.credentials)
        return UserContext(
            user_id=payload.get("sub", ""),
            email=payload.get("email", ""),
            role=payload.get("role", "authenticated"),
        )
    except HTTPException:
        return None
