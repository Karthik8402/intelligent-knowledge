from fastapi import APIRouter

from .endpoints import chat, documents, system

api_router = APIRouter()
api_router.include_router(documents.router, tags=["documents"])
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(system.router, tags=["system"])
