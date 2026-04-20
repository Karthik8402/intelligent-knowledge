from __future__ import annotations


def validate_citation_indices(citation_indices: list[int], total_sources: int) -> list[int]:
    valid = []
    seen = set()
    for idx in citation_indices:
        try:
            val = int(idx)
        except (ValueError, TypeError):
            continue
        if val < 1 or val > total_sources:
            continue
        if val in seen:
            continue
        seen.add(val)
        valid.append(val)

    return valid
