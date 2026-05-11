"""POST/GET /ai/readings — generate or list AI readings for the current user.

Dedup logic: with `temperature=0` Gemini is deterministic, so the same
`(user, kind, sorted-stones, gender_at_time)` tuple always produces the same
text. The `ai_readings` UNIQUE constraint encodes this — we check the cache
before paying for an LLM round-trip and return the existing row on hit.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import AIReading, Article, User
from ..schemas import AIReadingCreate, AIReadingOut
from ..services import gemini

router = APIRouter(prefix="/ai", tags=["ai"])

MAX_LIMIT = 50


def _normalised_slugs(slugs: list[str], db: Session) -> list[str]:
    cleaned = sorted({s.strip().lower() for s in slugs if s and s.strip()})
    if not 1 <= len(cleaned) <= 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pick between 1 and 3 stones",
        )
    rows = db.execute(
        select(Article.slug).where(Article.slug.in_(cleaned))
    ).scalars().all()
    found = set(rows)
    missing = [s for s in cleaned if s not in found]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown stones: {missing}",
        )
    return cleaned


@router.post("/readings", response_model=AIReadingOut)
def create_reading(
    payload: AIReadingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    slugs = _normalised_slugs(payload.stone_slugs, db)
    slugs_str = ",".join(slugs)
    gender = current_user.gender

    existing = db.execute(
        select(AIReading).where(
            AIReading.user_id == current_user.id,
            AIReading.kind == payload.kind,
            AIReading.stone_slugs == slugs_str,
            AIReading.gender_at_time == gender,
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    try:
        if payload.kind == "perfume":
            content = gemini.generate_perfume_reading(slugs, gender)
        else:
            content = gemini.generate_personality_reading(slugs)
    except gemini.AIConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI features not configured on this server",
        ) from exc
    except gemini.AIRateLimitError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI rate limit hit — try again in a moment",
        ) from exc
    except gemini.AIServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI service is currently unavailable",
        ) from exc

    reading = AIReading(
        user_id=current_user.id,
        kind=payload.kind,
        stone_slugs=slugs_str,
        gender_at_time=gender,
        content=content,
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading


@router.get("/readings", response_model=list[AIReadingOut])
def list_readings(
    limit: int = Query(20, ge=1, le=MAX_LIMIT),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = db.execute(
        select(AIReading)
        .where(AIReading.user_id == current_user.id)
        .order_by(AIReading.created_at.desc())
        .limit(limit)
    ).scalars().all()
    return rows
