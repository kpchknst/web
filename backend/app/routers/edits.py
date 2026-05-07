"""Article-edit proposals and the moderation queue (Variant 5).

Routes are split across two URL roots, which is why this router is
included in main.py without a prefix:

- POST /articles/{slug}/edits     (regular+ proposes an edit)
- GET  /edits                      (admin: queue)
- GET  /edits/{id}                 (admin or own editor)
- GET  /me/edits                   (any authenticated user: own history)
- POST /edits/{id}/approve         (admin)
- POST /edits/{id}/reject          (admin)
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..auth import get_current_user, require_admin
from ..db import get_db
from ..models import Article, ArticleEdit, User
from ..schemas import EditCreate, EditOut, EditReject

router = APIRouter()


@router.post("/articles/{slug}/edits", response_model=EditOut, status_code=201)
def propose_edit(
    slug: str,
    payload: EditCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    article = db.query(Article).filter(Article.slug == slug).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    edit = ArticleEdit(
        article_id=article.id,
        editor_id=current.id,
        proposed_title=payload.proposed_title,
        proposed_content=payload.proposed_content,
        base_version=payload.base_version,
        status="pending",
    )
    db.add(edit)
    db.commit()
    db.refresh(edit)
    return edit


@router.get("/edits", response_model=list[EditOut])
def list_edits(
    status: Optional[str] = Query(None, pattern="^(pending|approved|rejected|stale)$"),
    article_slug: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(ArticleEdit)
    if status:
        query = query.filter(ArticleEdit.status == status)
    if article_slug:
        article = db.query(Article).filter(Article.slug == article_slug).first()
        if not article:
            return []
        query = query.filter(ArticleEdit.article_id == article.id)
    return (
        query.order_by(ArticleEdit.submitted_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/me/edits", response_model=list[EditOut])
def list_my_edits(
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(ArticleEdit)
        .filter(ArticleEdit.editor_id == current.id)
        .order_by(ArticleEdit.submitted_at.desc())
        .all()
    )


@router.get("/edits/{edit_id}", response_model=EditOut)
def get_edit(
    edit_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    edit = db.query(ArticleEdit).filter(ArticleEdit.id == edit_id).first()
    if not edit:
        raise HTTPException(status_code=404, detail="Edit not found")
    if current.role != "admin" and edit.editor_id != current.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return edit


@router.post("/edits/{edit_id}/approve", response_model=EditOut)
def approve_edit(
    edit_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    edit = db.query(ArticleEdit).filter(ArticleEdit.id == edit_id).first()
    if not edit:
        raise HTTPException(status_code=404, detail="Edit not found")
    if edit.status not in ("pending", "stale"):
        raise HTTPException(status_code=409, detail=f"Edit already {edit.status}")
    article = db.query(Article).filter(Article.id == edit.article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    article.title = edit.proposed_title
    article.content = edit.proposed_content
    article.version += 1
    edit.status = "approved"
    edit.reviewed_at = datetime.now(timezone.utc)
    edit.reviewer_id = admin.id
    # Variant 5: mark other pending edits with older base_version as stale.
    others = (
        db.query(ArticleEdit)
        .filter(
            ArticleEdit.article_id == article.id,
            ArticleEdit.id != edit.id,
            ArticleEdit.status == "pending",
            ArticleEdit.base_version < article.version,
        )
        .all()
    )
    for other in others:
        other.status = "stale"
    db.commit()
    db.refresh(edit)
    return edit


@router.post("/edits/{edit_id}/reject", response_model=EditOut)
def reject_edit(
    edit_id: str,
    payload: EditReject,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    edit = db.query(ArticleEdit).filter(ArticleEdit.id == edit_id).first()
    if not edit:
        raise HTTPException(status_code=404, detail="Edit not found")
    if edit.status not in ("pending", "stale"):
        raise HTTPException(status_code=409, detail=f"Edit already {edit.status}")
    edit.status = "rejected"
    edit.reviewed_at = datetime.now(timezone.utc)
    edit.reviewer_id = admin.id
    edit.rejection_reason = payload.reason
    db.commit()
    db.refresh(edit)
    return edit
