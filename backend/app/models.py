"""SQLAlchemy ORM models for the Stones & Scents Encyclopedia.

Five tables: users, articles, article_edits, tags, article_tags. IDs are
stored as String(36) UUIDs so the schema works on both Postgres and SQLite.
"""

import uuid
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from .db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(10), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    articles = relationship(
        "Article", back_populates="author", foreign_keys="Article.author_id"
    )
    edits = relationship(
        "ArticleEdit", back_populates="editor", foreign_keys="ArticleEdit.editor_id"
    )


class Article(Base):
    __tablename__ = "articles"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    cover_image_url = Column(Text, nullable=True)
    author_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    author = relationship("User", back_populates="articles", foreign_keys=[author_id])
    edits = relationship(
        "ArticleEdit", back_populates="article", cascade="all, delete-orphan"
    )
    tags = relationship("Tag", secondary="article_tags", back_populates="articles")


class ArticleEdit(Base):
    __tablename__ = "article_edits"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    article_id = Column(
        String(36),
        ForeignKey("articles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    editor_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    proposed_title = Column(String(200), nullable=False)
    proposed_content = Column(Text, nullable=False)
    base_version = Column(Integer, nullable=False)
    status = Column(String(10), nullable=False, default="pending", index=True)
    submitted_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewer_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    rejection_reason = Column(Text, nullable=True)

    article = relationship("Article", back_populates="edits")
    editor = relationship("User", back_populates="edits", foreign_keys=[editor_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])


class Tag(Base):
    __tablename__ = "tags"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(50), nullable=False)
    slug = Column(String(50), unique=True, nullable=False)

    articles = relationship("Article", secondary="article_tags", back_populates="tags")


class ArticleTag(Base):
    __tablename__ = "article_tags"

    article_id = Column(
        String(36), ForeignKey("articles.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id = Column(
        String(36), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True
    )
