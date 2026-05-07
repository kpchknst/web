"""Pydantic v2 request/response schemas.

The 2000-char limit on article content (Variant 5) is enforced here via
`Field(max_length=2000)` for defence in depth alongside model validation.
"""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

Role = Literal["regular", "admin"]
EditStatus = Literal["pending", "approved", "rejected", "stale"]


# --- auth ----------------------------------------------------------------

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- users ---------------------------------------------------------------

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)
    role: Optional[Role] = "regular"


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    password: Optional[str] = Field(None, min_length=6, max_length=128)
    role: Optional[Role] = None


class UserOut(BaseModel):
    id: str
    username: str
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- tags ----------------------------------------------------------------

class TagOut(BaseModel):
    id: str
    name: str
    slug: str

    model_config = ConfigDict(from_attributes=True)


# --- articles ------------------------------------------------------------

class ArticleCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=1, max_length=2000)
    cover_image_url: Optional[str] = Field(None, max_length=2048)
    tag_ids: list[str] = Field(default_factory=list)


class ArticleUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1, max_length=2000)
    cover_image_url: Optional[str] = Field(None, max_length=2048)
    tag_ids: Optional[list[str]] = None


class ArticleOut(BaseModel):
    id: str
    slug: str
    title: str
    content: str
    cover_image_url: Optional[str] = None
    author_id: Optional[str] = None
    version: int
    created_at: datetime
    updated_at: datetime
    tags: list[TagOut] = []

    model_config = ConfigDict(from_attributes=True)


# --- edits ---------------------------------------------------------------

class EditCreate(BaseModel):
    proposed_title: str = Field(..., min_length=1, max_length=200)
    proposed_content: str = Field(..., min_length=1, max_length=2000)
    base_version: int = Field(..., ge=1)


class EditOut(BaseModel):
    id: str
    article_id: str
    editor_id: str
    proposed_title: str
    proposed_content: str
    base_version: int
    status: str
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewer_id: Optional[str] = None
    rejection_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EditReject(BaseModel):
    reason: str = Field(..., min_length=1, max_length=500)
