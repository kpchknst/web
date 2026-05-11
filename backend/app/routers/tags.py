"""Tag CRUD. Public read, admin write."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..db import get_db
from ..models import Tag, User
from ..schemas import TagCreate, TagOut, TagUpdate

router = APIRouter()


@router.get("", response_model=list[TagOut])
def list_tags(db: Session = Depends(get_db)):
    return db.query(Tag).order_by(Tag.name).all()


@router.post("", response_model=TagOut, status_code=201)
def create_tag(
    payload: TagCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.query(Tag).filter(Tag.slug == payload.slug).first():
        raise HTTPException(status_code=409, detail="Slug already exists")
    tag = Tag(name=payload.name, slug=payload.slug)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.put("/{tag_id}", response_model=TagOut)
def update_tag(
    tag_id: str,
    payload: TagUpdate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    if payload.slug is not None and payload.slug != tag.slug:
        clash = db.query(Tag).filter(Tag.slug == payload.slug, Tag.id != tag_id).first()
        if clash:
            raise HTTPException(status_code=409, detail="Slug already exists")
        tag.slug = payload.slug
    if payload.name is not None:
        tag.name = payload.name
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=204)
def delete_tag(
    tag_id: str,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(tag)
    db.commit()
