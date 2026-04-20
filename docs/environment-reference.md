# Environment Reference

This file documents backend environment variables.

## Core provider settings

- `LLM_PROVIDER`
  - Allowed: `google`, `openai`, `groq`
  - Default: `google`

- `LLM_MODEL`
  - Default: `gemma-3-27b-it`
  - Example alternatives: `gpt-4o-mini`, `llama-3.3-70b-versatile`

- `GOOGLE_API_KEY`
  - Required when `LLM_PROVIDER=google` or `EMBEDDING_PROVIDER=google`

- `OPENAI_API_KEY`
  - Required when `LLM_PROVIDER=openai` or `EMBEDDING_PROVIDER=openai`

- `GROQ_API_KEY`
  - Required when `LLM_PROVIDER=groq`

## Embedding settings

- `EMBEDDING_PROVIDER`
  - Allowed: `google`, `openai`, `huggingface`
  - Default: `google`

- `EMBEDDING_MODEL`
  - Default: `text-embedding-004`

## Vector and storage settings

- `VECTOR_STORE`
  - Allowed: `chroma`, `faiss`
  - Default: `chroma`

- `CHROMA_PERSIST_DIR`
  - Default: `./data/chroma`

- `UPLOAD_DIR`
  - Default: `./data/uploads`

- `METADATA_DB_PATH`
  - Default: `./data/document_registry.json`

## RAG tuning settings

- `RAG_TOP_K`
  - Default: `5`

- `RAG_CHUNK_SIZE`
  - Default: `1000`

- `RAG_CHUNK_OVERLAP`
  - Default: `200`

- `MAX_UPLOAD_SIZE_MB`
  - Default: `25`
