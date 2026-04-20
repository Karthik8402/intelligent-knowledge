from app.citations import validate_citation_indices


def test_validate_citation_indices_filters_invalid_entries():
    valid = validate_citation_indices([1, 3, 0, 4, 3, -1, 10], total_sources=4)
    assert valid == [1, 3, 4]
