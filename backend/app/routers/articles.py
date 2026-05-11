"""Article CRUD. Public read, admin write. Versioning is handled here.

Also exposes GET /{slug}/history with the article's approved-edit history.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..db import get_db
from ..models import Article, ArticleEdit, Tag, User
from ..schemas import ArticleCreate, ArticleOut, ArticleUpdate, EditOut

router = APIRouter()


@router.get("", response_model=list[ArticleOut])
def list_articles(
    q: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Article)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Article.title.ilike(like), Article.content.ilike(like)))
    if tag:
        query = query.join(Article.tags).filter(Tag.slug == tag)
    return query.order_by(Article.created_at.desc()).offset(offset).limit(limit).all()


@router.post("", response_model=ArticleOut, status_code=201)
def create_article(
    payload: ArticleCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.query(Article).filter(Article.slug == payload.slug).first():
        raise HTTPException(status_code=409, detail="Slug already exists")
    article = Article(
        slug=payload.slug,
        title=payload.title,
        content=payload.content,
        cover_image_url=payload.cover_image_url,
        author_id=admin.id,
    )
    if payload.tag_ids:
        article.tags = db.query(Tag).filter(Tag.id.in_(payload.tag_ids)).all()
    db.add(article)
    db.commit()
    db.refresh(article)
    return article


@router.get("/{slug}", response_model=ArticleOut)
def get_article(slug: str, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.slug == slug).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.put("/{slug}", response_model=ArticleOut)
def update_article(
    slug: str,
    payload: ArticleUpdate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    article = db.query(Article).filter(Article.slug == slug).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if payload.title is not None:
        article.title = payload.title
    if payload.content is not None:
        article.content = payload.content
    if payload.cover_image_url is not None:
        article.cover_image_url = payload.cover_image_url
    if payload.tag_ids is not None:
        article.tags = db.query(Tag).filter(Tag.id.in_(payload.tag_ids)).all()
    article.version += 1
    db.commit()
    db.refresh(article)
    return article


@router.delete("/{slug}", status_code=204)
def delete_article(
    slug: str,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    article = db.query(Article).filter(Article.slug == slug).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    db.delete(article)
    db.commit()


@router.get("/{slug}/history", response_model=list[EditOut])
def article_history(slug: str, db: Session = Depends(get_db)):
    """Return the article's approved edits, oldest first."""
    article = db.query(Article).filter(Article.slug == slug).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return (
        db.query(ArticleEdit)
        .filter(
            ArticleEdit.article_id == article.id,
            ArticleEdit.status == "approved",
        )
        .order_by(ArticleEdit.reviewed_at.asc())
        .all()
    )
