-- ============================================================
-- Supabase Migration: Quick Knowledge Base
-- Run this in the Supabase SQL Editor to set up your database.
-- ============================================================

-- 1. Enable the pgvector extension (required for embedding storage)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Documents metadata table
CREATE TABLE IF NOT EXISTS documents (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_id     TEXT UNIQUE NOT NULL,
    file_name       TEXT NOT NULL,
    source_type     TEXT NOT NULL DEFAULT 'pdf',
    pages           INTEGER NOT NULL DEFAULT 0,
    chunks          INTEGER NOT NULL DEFAULT 0,
    content_hash    TEXT NOT NULL,
    owner_id        UUID NOT NULL,           -- Supabase Auth user ID
    storage_path    TEXT,                     -- Path in Supabase Storage
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents(content_hash);

-- 3. Row Level Security (RLS) on documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Users can only see their own documents
CREATE POLICY "Users can view own documents"
    ON documents FOR SELECT
    USING (auth.uid() = owner_id);

-- Users can only insert their own documents
CREATE POLICY "Users can insert own documents"
    ON documents FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Users can only delete their own documents
CREATE POLICY "Users can delete own documents"
    ON documents FOR DELETE
    USING (auth.uid() = owner_id);

-- Users can only update their own documents
CREATE POLICY "Users can update own documents"
    ON documents FOR UPDATE
    USING (auth.uid() = owner_id);

-- 4. Service role bypass (for backend server-side operations)
-- The backend uses the service_role key which bypasses RLS automatically.
-- No additional policy needed.

-- 5. Create the Storage bucket (run manually in Supabase Dashboard > Storage)
-- Bucket name: "documents"
-- Public: false
-- File size limit: 25MB
-- Allowed MIME types: application/pdf, text/plain, text/markdown,
--   application/vnd.openxmlformats-officedocument.wordprocessingml.document

-- Note: The pgvector chunks table is managed automatically by
-- langchain-postgres PGVector. It creates a "langchain_pg_collection"
-- and "langchain_pg_embedding" table on first use.
