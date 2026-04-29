from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── LLM / Embedding ──
    llm_provider: str = "google"
    llm_model: str = "gemma-3-27b-it"
    google_api_key: str = ""
    openai_api_key: str = ""
    groq_api_key: str = ""

    embedding_provider: str = "google"
    embedding_model: str = "gemini-embedding-001"

    # ── Vector Store ──
    vector_store: str = "chroma"
    chroma_persist_dir: str = "./data/chroma"

    # ── Storage ──
    upload_dir: str = "./data/uploads"
    metadata_db_path: str = "./data/document_registry.json"
    sqlite_db_path: str = "./data/knowledge_base.db"

    # ── RAG ──
    rag_top_k: int = 5
    rag_chunk_size: int = 1000
    rag_chunk_overlap: int = 200

    # ── Limits ──
    max_upload_size_mb: int = 25
    rate_limit: str = "10/minute"

    # ── CORS ──
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()

    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.metadata_db_path).parent.mkdir(parents=True, exist_ok=True)
    Path(settings.sqlite_db_path).parent.mkdir(parents=True, exist_ok=True)

    return settings
