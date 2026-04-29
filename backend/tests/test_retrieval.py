"""Tests for app.retrieval — vector store building and chunk retrieval."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from langchain_core.documents import Document


class TestRetrieveChunks:
    """Tests for the retrieve_chunks function."""

    @patch("app.retrieval.get_settings")
    def test_chroma_retrieval_without_filters(self, mock_settings):
        from app.retrieval import retrieve_chunks

        mock_settings.return_value = MagicMock(vector_store="chroma")

        doc = Document(page_content="chunk text", metadata={"document_id": "d1"})
        mock_store = MagicMock()
        mock_store.similarity_search_with_relevance_scores.return_value = [(doc, 0.85)]

        results = retrieve_chunks(mock_store, "question?", top_k=5)

        assert len(results) == 1
        assert results[0][1] == 0.85
        mock_store.similarity_search_with_relevance_scores.assert_called_once_with(
            query="question?", k=5, filter=None
        )

    @patch("app.retrieval.get_settings")
    def test_chroma_retrieval_with_document_filter(self, mock_settings):
        from app.retrieval import retrieve_chunks

        mock_settings.return_value = MagicMock(vector_store="chroma")

        mock_store = MagicMock()
        mock_store.similarity_search_with_relevance_scores.return_value = []

        retrieve_chunks(mock_store, "q?", top_k=3, document_ids=["d1", "d2"])

        call_kwargs = mock_store.similarity_search_with_relevance_scores.call_args
        assert call_kwargs.kwargs["filter"] == {"document_id": {"$in": ["d1", "d2"]}}

    @patch("app.retrieval.get_settings")
    def test_faiss_retrieval_normalizes_scores(self, mock_settings):
        from app.retrieval import retrieve_chunks

        mock_settings.return_value = MagicMock(vector_store="faiss")

        doc = Document(page_content="text", metadata={})
        mock_store = MagicMock()
        mock_store.similarity_search_with_score.return_value = [(doc, 0.123)]

        results = retrieve_chunks(mock_store, "q?", top_k=5)

        assert len(results) == 1
        assert isinstance(results[0][1], float)

    @patch("app.retrieval.get_settings")
    def test_returns_empty_for_no_matches(self, mock_settings):
        from app.retrieval import retrieve_chunks

        mock_settings.return_value = MagicMock(vector_store="chroma")

        mock_store = MagicMock()
        mock_store.similarity_search_with_relevance_scores.return_value = []

        results = retrieve_chunks(mock_store, "obscure question", top_k=5)
        assert results == []
