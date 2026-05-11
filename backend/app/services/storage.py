"""Supabase Storage upload wrapper with local-fs fallback for offline demo.

Production (Supabase Storage): set ``SUPABASE_URL`` and ``SUPABASE_SERVICE_KEY``
in the environment; uploads go to bucket ``SUPABASE_STORAGE_BUCKET``
(default ``article-covers``) and the returned URL is the public URL.

Offline / tests: when ``USE_SQLITE=1`` or ``SUPABASE_SERVICE_KEY`` is empty,
files are written into ``backend/uploads/`` and served by FastAPI's
``StaticFiles`` mount at ``/uploads/<key>``.
"""

import os
import uuid
from pathlib import Path

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 2 * 1024 * 1024  # 2 MB
LOCAL_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"

_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


class StorageError(Exception):
    """Raised on validation failure or upstream storage failure."""


def upload(file_bytes: bytes, mime: str) -> str:
    """Validate and store ``file_bytes``, returning a URL to the saved object."""
    if mime not in ALLOWED_MIME:
        raise StorageError(f"unsupported mime {mime}")
    if len(file_bytes) > MAX_BYTES:
        raise StorageError("file too large")

    key = f"{uuid.uuid4()}.{_EXT[mime]}"

    if os.getenv("USE_SQLITE") == "1" or not os.getenv("SUPABASE_SERVICE_KEY"):
        return _upload_local(file_bytes, key)
    return _upload_supabase(file_bytes, key, mime)


def _upload_local(file_bytes: bytes, key: str) -> str:
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    (LOCAL_DIR / key).write_bytes(file_bytes)
    return f"/uploads/{key}"


def _upload_supabase(file_bytes: bytes, key: str, mime: str) -> str:
    from supabase import create_client

    try:
        url = os.environ["SUPABASE_URL"]
        service_key = os.environ["SUPABASE_SERVICE_KEY"]
    except KeyError as exc:
        raise StorageError(f"missing env var {exc.args[0]}") from exc

    bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "article-covers")
    sb = create_client(url, service_key)
    try:
        sb.storage.from_(bucket).upload(key, file_bytes, {"content-type": mime})
        url = sb.storage.from_(bucket).get_public_url(key)
    except Exception as exc:  # noqa: BLE001 — surface any SDK failure as 503
        raise StorageError(f"supabase upload failed: {exc}") from exc
    if not url:
        raise StorageError("supabase did not return a public url")
    return url
