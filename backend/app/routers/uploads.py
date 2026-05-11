"""POST /uploads — admin-only multipart cover-image upload."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..auth import require_admin
from ..models import User
from ..schemas import UploadOut
from ..services.storage import StorageError, upload

router = APIRouter()


@router.post("", response_model=UploadOut, status_code=201)
async def upload_cover(
    file: UploadFile = File(...),
    _admin: User = Depends(require_admin),
):
    body = await file.read()
    try:
        url = upload(body, file.content_type or "", file.filename or "upload")
    except StorageError as exc:
        msg = str(exc)
        if "unsupported" in msg:
            raise HTTPException(status_code=415, detail=msg) from exc
        if "too large" in msg:
            raise HTTPException(status_code=413, detail=msg) from exc
        raise HTTPException(status_code=503, detail="storage unavailable") from exc
    return {"url": url}
