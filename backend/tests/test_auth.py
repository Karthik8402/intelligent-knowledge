"""Tests for Supabase auth token verification."""

from __future__ import annotations

import time

import jwt
import pytest

from app.core.auth import UserContext, verify_access_token, verify_jwt


def _make_payload() -> dict:
    return {
        "aud": "authenticated",
        "email": "user@example.com",
        "exp": int(time.time()) + 3600,
        "iss": "https://project.supabase.co/auth/v1",
        "role": "authenticated",
        "sub": "user-123",
    }


def test_verify_jwt_accepts_valid_hs256_token(monkeypatch):
    from app.config import get_settings
    from app.core import auth

    get_settings.cache_clear()
    auth._token_user_cache.clear()
    monkeypatch.setenv("AUTH_ENABLED", "true")
    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "test-secret")

    token = jwt.encode(_make_payload(), "test-secret", algorithm="HS256")

    payload = verify_jwt(token)

    assert payload["sub"] == "user-123"
    assert payload["email"] == "user@example.com"
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_verify_access_token_falls_back_to_supabase_auth(monkeypatch):
    from app.config import get_settings
    from app.core import auth

    get_settings.cache_clear()
    auth._token_user_cache.clear()
    monkeypatch.setenv("AUTH_ENABLED", "true")
    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "anon-key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "different-secret")

    token = jwt.encode(_make_payload(), "actual-token-secret", algorithm="HS256")

    async def fake_auth_server(_token: str) -> UserContext:
        return UserContext(user_id="user-123", email="user@example.com")

    monkeypatch.setattr(auth, "_verify_with_supabase_auth", fake_auth_server)

    user = await verify_access_token(token)

    assert user.user_id == "user-123"
    assert user.email == "user@example.com"
    get_settings.cache_clear()
