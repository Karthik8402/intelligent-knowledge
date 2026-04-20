from app.generation import FALLBACK_ANSWER, answer_with_citations


def test_fallback_when_no_retrieved_docs():
    result = answer_with_citations("What is warranty?", [])
    assert result["answer"] == FALLBACK_ANSWER
    assert result["citation_indices"] == []
