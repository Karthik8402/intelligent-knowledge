import hashlib
import json
from datetime import datetime, UTC
from pathlib import Path

from .config import get_settings


class DocumentRegistry:
    def __init__(self) -> None:
        settings = get_settings()
        self.path = Path(settings.metadata_db_path)
        if not self.path.exists():
            self.path.write_text(json.dumps({"documents": []}, indent=2), encoding="utf-8")

    def _read(self) -> dict:
        return json.loads(self.path.read_text(encoding="utf-8"))

    def _write(self, payload: dict) -> None:
        self.path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def list_documents(self) -> list[dict]:
        return self._read().get("documents", [])

    def find_by_hash(self, content_hash: str) -> dict | None:
        for item in self.list_documents():
            if item.get("content_hash") == content_hash:
                return item
        return None

    def get(self, document_id: str) -> dict | None:
        for item in self.list_documents():
            if item.get("document_id") == document_id:
                return item
        return None

    def upsert(self, item: dict) -> None:
        payload = self._read()
        docs = payload.get("documents", [])
        docs = [d for d in docs if d.get("document_id") != item.get("document_id")]
        docs.append(item)
        payload["documents"] = docs
        self._write(payload)

    def delete(self, document_id: str) -> dict | None:
        payload = self._read()
        docs = payload.get("documents", [])
        target = None
        remaining = []
        for doc in docs:
            if doc.get("document_id") == document_id:
                target = doc
            else:
                remaining.append(doc)

        payload["documents"] = remaining
        self._write(payload)
        return target


registry = DocumentRegistry()


def content_hash_from_path(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        while chunk := fh.read(8192):
            digest.update(chunk)
    return digest.hexdigest()


def create_document_id(content_hash: str) -> str:
    return content_hash[:16]


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()
