"""Tests for the generation module — covers context building, message construction, response parsing, and streaming."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from langchain_core.documents import Document

from tests.conftest import make_document


class TestBuildContext:
    def test_build_context_single_doc(self):
        from app.generation import build_context

        doc = make_document(text="hello world", document_id="d1", file_name="a.pdf", page=0)
        result = build_context([(doc, 0.9)])
        assert "[Source 1]" in result
        assert "hello world" in result
        assert "a.pdf" in result

    def test_build_context_multiple_docs(self):
        from app.generation import build_context

        docs = [
            (make_document(text="first", document_id="d1"), 0.9),
            (make_document(text="second", document_id="d2"), 0.8),
        ]
        result = build_context(docs)
        assert "[Source 1]" in result
        assert "[Source 2]" in result
        assert "first" in result
        assert "second" in result

    def test_build_context_no_page(self):
        from app.generation import build_context

        doc = make_document(text="text", page=None)
        result = build_context([(doc, 0.5)])
        assert "n/a" in result


class TestParseResponse:
    def test_parse_valid_json(self):
        from app.generation import _parse_llm_response

        result = _parse_llm_response('{"answer": "test answer", "citation_indices": [1, 2]}')
        assert result["answer"] == "test answer"
        assert result["citation_indices"] == [1, 2]

    def test_parse_json_with_code_fences(self):
        from app.generation import _parse_llm_response

        result = _parse_llm_response('```json\n{"answer": "fenced", "citation_indices": [1]}\n```')
        assert result["answer"] == "fenced"

    def test_parse_invalid_json_returns_fallback(self):
        from app.generation import FALLBACK_ANSWER, _parse_llm_response

        result = _parse_llm_response("this is not json at all")
        assert result["answer"] == FALLBACK_ANSWER
        assert result["citation_indices"] == []

    def test_parse_missing_fields(self):
        from app.generation import FALLBACK_ANSWER, _parse_llm_response

        result = _parse_llm_response('{"random": "data"}')
        assert result["answer"] == FALLBACK_ANSWER

    def test_parse_invalid_citation_type(self):
        from app.generation import _parse_llm_response

        result = _parse_llm_response('{"answer": "ok", "citation_indices": "not a list"}')
        assert result["citation_indices"] == []

    def test_parse_empty_string(self):
        from app.generation import FALLBACK_ANSWER, _parse_llm_response

        result = _parse_llm_response("")
        assert result["answer"] == FALLBACK_ANSWER


class TestBuildMessages:
    def test_build_messages_standard_provider(self):
        from app.generation import _build_messages

        with patch("app.generation.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                llm_provider="openai", llm_model="gpt-4"
            )
            messages = _build_messages("What is AI?", "context here")
            assert len(messages) == 2  # SystemMessage + HumanMessage

    def test_build_messages_gemma_uses_single_prompt(self):
        from app.generation import _build_messages

        with patch("app.generation.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                llm_provider="google", llm_model="gemma-3-27b-it"
            )
            messages = _build_messages("What is AI?", "context here")
            assert len(messages) == 1  # Single HumanMessage for Gemma


class TestAnswerWithCitations:
    def test_empty_docs_returns_fallback(self):
        from app.generation import FALLBACK_ANSWER, answer_with_citations

        result = answer_with_citations("test", [])
        assert result["answer"] == FALLBACK_ANSWER
        assert result["citation_indices"] == []

    @patch("app.generation.get_chat_model")
    def test_llm_exception_returns_fallback(self, mock_get_model):
        from app.generation import FALLBACK_ANSWER, answer_with_citations

        mock_model = MagicMock()
        mock_model.invoke.side_effect = Exception("API error")
        mock_get_model.return_value = mock_model

        docs = [(make_document(), 0.9)]
        result = answer_with_citations("question", docs)
        assert result["answer"] == FALLBACK_ANSWER

    @patch("app.generation.get_chat_model")
    def test_valid_llm_response(self, mock_get_model):
        from app.generation import answer_with_citations

        mock_response = MagicMock()
        mock_response.content = '{"answer": "Test answer", "citation_indices": [1]}'
        mock_model = MagicMock()
        mock_model.invoke.return_value = mock_response
        mock_get_model.return_value = mock_model

        docs = [(make_document(), 0.9)]
        result = answer_with_citations("question", docs)
        assert result["answer"] == "Test answer"
        assert result["citation_indices"] == [1]


class TestStreamAnswerWithCitations:
    def test_stream_empty_docs_returns_fallback(self):
        from app.generation import FALLBACK_ANSWER, stream_answer_with_citations

        result = stream_answer_with_citations("test", [])
        tokens = list(result["tokens"])
        assert tokens == [FALLBACK_ANSWER]

    @patch("app.generation.get_chat_model")
    def test_stream_yields_tokens(self, mock_get_model):
        from app.generation import stream_answer_with_citations

        # Mock the streaming response
        mock_chunk1 = MagicMock()
        mock_chunk1.content = '{"answer":'
        mock_chunk2 = MagicMock()
        mock_chunk2.content = ' "streamed",'
        mock_chunk3 = MagicMock()
        mock_chunk3.content = ' "citation_indices": [1]}'

        mock_model = MagicMock()
        mock_model.stream.return_value = [mock_chunk1, mock_chunk2, mock_chunk3]
        mock_get_model.return_value = mock_model

        docs = [(make_document(), 0.9)]
        result = stream_answer_with_citations("question", docs)

        tokens = list(result["tokens"])
        assert len(tokens) == 3
        assert '{"answer":' in tokens[0]


class TestGetSystemPrompt:
    def test_system_prompt_contains_json_shape(self):
        from app.generation import _get_system_prompt

        prompt = _get_system_prompt()
        assert "JSON" in prompt
        assert "citation_indices" in prompt
        assert "answer" in prompt
