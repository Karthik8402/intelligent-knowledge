"""Tests for app.ingest — file ingestion pipeline."""

from __future__ import annotations

import os
from io import BytesIO
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from fastapi import UploadFile
from langchain_core.documents import Document


class TestEnrichMetadata:
    """Tests for the metadata enrichment function."""

    def test_adds_required_fields(self):
        from app.ingest import _enrich_metadata

        docs = [Document(page_content="Hello", metadata={"page": 0})]
        enriched = _enrich_metadata(docs, "doc-001", "test.pdf")

        assert len(enriched) == 1
        meta = enriched[0].metadata
        assert meta["document_id"] == "doc-001"
        assert meta["file_name"] == "test.pdf"
        assert meta["page"] == 0
        assert meta["source_type"] == "pdf"
        assert meta["chunk_index"] == 0
        assert "created_at" in meta

    def test_handles_missing_page_metadata(self):
        from app.ingest import _enrich_metadata

        docs = [Document(page_content="No page", metadata={})]
        enriched = _enrich_metadata(docs, "doc-002", "notes.txt")

        assert enriched[0].metadata["page"] is None

    def test_multiple_documents_indexed(self):
        from app.ingest import _enrich_metadata

        docs = [
            Document(page_content=f"Page {i}", metadata={"page": i})
            for i in range(5)
        ]
        enriched = _enrich_metadata(docs, "doc-003", "manual.pdf")

        assert len(enriched) == 5
        for i, doc in enumerate(enriched):
            assert doc.metadata["chunk_index"] == i


class TestLoadDocuments:
    """Tests for the document loader dispatch."""

    def test_raises_on_unsupported_file_type(self, tmp_path):
        from app.ingest import _load_documents

        fake_file = tmp_path / "data.xlsx"
        fake_file.write_text("data")

        with pytest.raises(ValueError, match="Unsupported file type"):
            _load_documents(fake_file)

    def test_loads_txt_file(self, tmp_path):
        from app.ingest import _load_documents

        txt_file = tmp_path / "sample.txt"
        txt_file.write_text("Hello, this is a test document.", encoding="utf-8")

        docs = _load_documents(txt_file)
        assert len(docs) >= 1
        assert "Hello" in docs[0].page_content

    def test_loads_md_file(self, tmp_path):
        from app.ingest import _load_documents

        md_file = tmp_path / "readme.md"
        md_file.write_text("# Title\n\nSome markdown content.", encoding="utf-8")

        docs = _load_documents(md_file)
        assert len(docs) >= 1


class TestSaveUpload:
    """Tests for the file save helper."""

    def test_saves_file_correctly(self, tmp_path):
        from app.ingest import _save_upload

        content = b"file content bytes"
        mock_upload = MagicMock(spec=UploadFile)
        mock_upload.file = BytesIO(content)

        dest = tmp_path / "subdir" / "uploaded.txt"
        _save_upload(mock_upload, dest)

        assert dest.exists()
        assert dest.read_bytes() == content


class TestIngestFiles:
    """Integration-level tests for the ingest_files function."""

    def test_handles_empty_filename(self, tmp_registry, mock_vector_store):
        from app.ingest import ingest_files

        mock_upload = MagicMock(spec=UploadFile)
        mock_upload.filename = ""

        results = ingest_files([mock_upload], mock_vector_store)
        assert len(results) == 1
        assert results[0]["status"] == "failed"

    def test_rejects_unsupported_extension(self, tmp_registry, mock_vector_store):
        from app.ingest import ingest_files

        mock_upload = MagicMock(spec=UploadFile)
        mock_upload.filename = "data.xlsx"

        results = ingest_files([mock_upload], mock_vector_store)
        assert results[0]["status"] == "failed"
        assert "Unsupported" in results[0]["error"]

    def test_successful_txt_ingestion(self, tmp_registry, mock_vector_store, tmp_path):
        from app.ingest import ingest_files

        content = b"This is test content for ingestion. " * 20
        mock_upload = MagicMock(spec=UploadFile)
        mock_upload.filename = "test_doc.txt"
        mock_upload.file = BytesIO(content)

        results = ingest_files([mock_upload], mock_vector_store)
        assert len(results) == 1
        assert results[0]["status"] == "indexed"
        assert results[0]["chunks"] > 0
