"""Comprehensive tests for app.citations.validate_citation_indices."""

import pytest
from app.citations import validate_citation_indices


class TestValidateCitationIndices:
    """Tests for the citation index validator."""

    def test_filters_out_of_range_entries(self):
        valid = validate_citation_indices([1, 3, 0, 4, 3, -1, 10], total_sources=4)
        assert valid == [1, 3, 4]

    def test_empty_input_returns_empty(self):
        assert validate_citation_indices([], total_sources=5) == []

    def test_all_valid_indices(self):
        assert validate_citation_indices([1, 2, 3], total_sources=3) == [1, 2, 3]

    def test_removes_duplicates(self):
        assert validate_citation_indices([2, 2, 2], total_sources=5) == [2]

    def test_non_integer_values_skipped(self):
        result = validate_citation_indices(["a", None, 1.5, 2], total_sources=5)
        # 1.5 should be truncated to 1 via int(), "a" and None should be skipped
        assert 2 in result

    def test_zero_total_sources_returns_empty(self):
        assert validate_citation_indices([1, 2, 3], total_sources=0) == []

    def test_single_source(self):
        assert validate_citation_indices([1], total_sources=1) == [1]
        assert validate_citation_indices([2], total_sources=1) == []

    def test_preserves_order(self):
        result = validate_citation_indices([3, 1, 2], total_sources=5)
        assert result == [3, 1, 2]

    def test_large_input(self):
        """Performance: should handle a large list without issues."""
        indices = list(range(-100, 200))
        result = validate_citation_indices(indices, total_sources=50)
        assert all(1 <= v <= 50 for v in result)
        assert len(result) == 50  # exactly 1..50

    def test_negative_indices_rejected(self):
        assert validate_citation_indices([-1, -5, -100], total_sources=10) == []

    def test_boundary_values(self):
        result = validate_citation_indices([0, 1, 5, 6], total_sources=5)
        assert result == [1, 5]
