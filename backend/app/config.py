from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    llm_provider: str = "google"
    llm_model: str = "gemma-3-27b-it"
    google_api_key: str = ""
    openai_api_key: str = ""
    groq_api_key: str = ""

    embedding_provider: str = "google"
    embedding_model: str = "gemini-embedding-001"

    vector_store: str = "chroma"
    chroma_persist_dir: str = "./data/chroma"

    upload_dir: str = "./data/uploads"
    metadata_db_path: str = "./data/document_registry.json"

    rag_top_k: int = 5
    rag_chunk_size: int = 1000
    rag_chunk_overlap: int = 200

    max_upload_size_mb: int = 25


@lru_cache
def get_settings() -> Settings:
    settings = Settings()

    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.metadata_db_path).parent.mkdir(parents=True, exist_ok=True)

    return settings
