"""Chat route: question answering with RAG citations + SSE streaming — secured."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends
from sse_starlette.sse import EventSourceResponse

from app.core.auth import UserContext, get_current_user
from app.dependencies import get_registry, get_vector_store_optional
from app.schemas import ChatRequest, ChatResponse
from app.services.chat_service import ChatService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def chat(
    body: ChatRequest,
    vector_store: Any = Depends(get_vector_store_optional),
    reg=Depends(get_registry),
    user: UserContext = Depends(get_current_user),
):
    if ChatService.check_prompt_injection(body.question):
        logger.warning("Prompt injection attempt blocked from user=%s", user.user_id)
        return ChatResponse(
            answer="I can only answer questions about your uploaded documents.",
            citations=[],
            retrieved_chunks=[],
        )

    return ChatService.build_chat_response(body.question, vector_store, reg, user.user_id)


@router.post("/chat/stream")
async def chat_stream(
    body: ChatRequest,
    vector_store: Any = Depends(get_vector_store_optional),
    reg=Depends(get_registry),
    user: UserContext = Depends(get_current_user),
):
    if ChatService.check_prompt_injection(body.question):
        logger.warning("Prompt injection attempt blocked (stream) from user=%s", user.user_id)

        async def injection_gen():
            yield {
                "event": "token",
                "data": "I can only answer questions about your uploaded documents.",
            }
            yield {"event": "citations", "data": json.dumps([])}
            yield {"event": "done", "data": ""}

        return EventSourceResponse(injection_gen())

    return EventSourceResponse(
        ChatService.chat_stream_generator(body.question, vector_store, reg, user.user_id)
    )
