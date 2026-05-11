# AI Stone Readings — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Add a logged-in-only `/my-reading` page where the user picks 1–3 stones + a mode (Perfume / Personality), Gemini 1.5 Flash at `temperature=0` generates the reading, and the result is saved to a per-user history surfaced on the profile page.

**Architecture:** Schema migration on Supabase → backend Gemini service + new `/ai/readings` router with dedupe via UNIQUE constraint → frontend SPA page + StonePicker + ReadingResult + profile history section + gender field on registration. Deploy through `feature-ai-readings` → `development` → `main` (auto-deploys to Render/Vercel).

**Tech Stack:** FastAPI + SQLAlchemy + `google-generativeai` (backend); React 18 + axios + `marked` (frontend); Gemini 1.5 Flash; Supabase Postgres.

**Pre-reqs already done:**
- `GEMINI_API_KEY` set in Render env vars by Anastasia ✓
- Render + Vercel auto-deploy on `main` push ✓
- `feature-ai-readings` branch created off `main` ✓
- Design doc at `docs/plans/2026-05-11-ai-stone-readings-design.md` ✓

**Reference docs:**
- Design — `docs/plans/2026-05-11-ai-stone-readings-design.md`
- Existing backend pattern — `backend/app/routers/users.py` (auth-gated CRUD)
- Existing frontend pattern — `frontend/src/pages/UsersListPage.jsx` (auth + fetch + render)

---

## Phase 1 — Supabase schema migration

### Task 1.1: Run schema migration on Supabase

**Action by Anastasia (one-time, manual):**

Open <https://supabase.com/dashboard/project/paxnpiuvpkcnemchvtvy/sql/new>. Paste and run:

```sql
ALTER TABLE users
    ADD COLUMN gender VARCHAR(20) NULL
    CHECK (gender IS NULL OR gender IN ('female', 'male', 'prefer_not_to_say'));

CREATE TABLE ai_readings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind            VARCHAR(20) NOT NULL CHECK (kind IN ('perfume','personality')),
    stone_slugs     TEXT NOT NULL,
    gender_at_time  VARCHAR(20) NULL,
    content         TEXT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, kind, stone_slugs, gender_at_time)
);

CREATE INDEX idx_ai_readings_user_created ON ai_readings (user_id, created_at DESC);
```

**Verify:**

```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'gender';
-- Expected: one row with "gender"

SELECT count(*) FROM ai_readings;
-- Expected: 0 (empty table)
```

---

## Phase 2 — Backend dependencies & models

### Task 2.1: Add google-generativeai to requirements.txt

**File:** `backend/requirements.txt`

**Add line:**
```
google-generativeai>=0.8
```

**Run locally:** `cd backend && source .venv/bin/activate && pip install -r requirements.txt`

### Task 2.2: Add `gender` column + `AIReading` model

**File:** `backend/app/models.py`

**Add to `User` class** (alongside existing columns):
```python
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
```

**Add new model at end of file:**
```python
class AIReading(Base):
    __tablename__ = "ai_readings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    stone_slugs: Mapped[str] = mapped_column(Text, nullable=False)
    gender_at_time: Mapped[str | None] = mapped_column(String(20), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
```

Add `Text` and `ForeignKey` to existing SQLAlchemy imports at the top of the file if not present.

### Task 2.3: Add Pydantic schemas

**File:** `backend/app/schemas.py`

**Add at end:**
```python
class GenderEnum(str, Enum):
    female = "female"
    male = "male"
    prefer_not_to_say = "prefer_not_to_say"


class AIReadingKind(str, Enum):
    perfume = "perfume"
    personality = "personality"


class AIReadingCreate(BaseModel):
    kind: AIReadingKind
    stone_slugs: list[str] = Field(..., min_length=1, max_length=3)


class AIReadingOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    kind: AIReadingKind
    stone_slugs: list[str]
    gender_at_time: GenderEnum | None
    content: str
    created_at: datetime

    @field_validator("stone_slugs", mode="before")
    @classmethod
    def split_slugs(cls, v):
        if isinstance(v, str):
            return [s for s in v.split(",") if s]
        return v

    model_config = ConfigDict(from_attributes=True)
```

**Update existing user schemas** to accept optional gender:
```python
# In UserCreate, UserUpdate, UserOut — add:
    gender: GenderEnum | None = None
```

Adjust imports at top — add `field_validator`, `ConfigDict`, `Enum`.

### Task 2.4: Update users router to accept gender

**File:** `backend/app/routers/users.py`

In the `create_user` and `update_user` route handlers, propagate `payload.gender` to the model (mirror how `role` is set). On `UserOut` responses, gender is auto-included via the schema.

### Task 2.5: Commit phase 2

```bash
git add backend/requirements.txt backend/app/models.py backend/app/schemas.py backend/app/routers/users.py
git commit -m "ai-readings: add gender column + AIReading model + Pydantic schemas"
```

---

## Phase 3 — Gemini service

### Task 3.1: Create `app/services/__init__.py`

**File:** `backend/app/services/__init__.py`

Empty file, just makes `services` a package.

### Task 3.2: Create Gemini service module

**File:** `backend/app/services/gemini.py`

```python
"""Thin wrapper around Google Gemini 1.5 Flash for AI readings."""

import os
from typing import Literal

import google.generativeai as genai


class AIConfigurationError(Exception):
    """GEMINI_API_KEY not set."""


class AIRateLimitError(Exception):
    """Gemini returned 429."""


class AIServiceError(Exception):
    """Generic Gemini failure (5xx, timeout)."""


_PERFUME_SYSTEM = (
    "You are a thoughtful perfume guide. Given the user's chosen stones and "
    "gender, suggest a fragrance pairing. If the user's gender is "
    "'prefer_not_to_say' or unset, recommend ONLY unisex perfumes. Output "
    "exactly two parts: (1) a 2-3 sentence opening paragraph describing the "
    "overall scent profile that fits the stones, then (2) a markdown bullet "
    "list of exactly two real perfume picks in the format "
    "`**Brand — Name** — one sentence on why it fits.` Do not invent perfumes; "
    "if unsure, fall back to classics. Be warm but concise."
)

_PERSONALITY_SYSTEM = (
    "You are a writer of mystical, warm-toned personality readings. Output "
    "exactly three markdown sections in this order: '## Your inner climate', "
    "'## What others see in you', '## What these stones are asking of you'. "
    "Each section is one paragraph of roughly 50-70 words. Weave together all "
    "the chosen stones; do not list them separately. Be poetic but specific."
)

GENERATION_CONFIG = {
    "temperature": 0,
    "top_p": 1,
    "max_output_tokens": 600,
}


def _configure() -> None:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise AIConfigurationError("GEMINI_API_KEY env var is not set")
    genai.configure(api_key=key)


def _call(system_instruction: str, user_prompt: str) -> str:
    _configure()
    try:
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system_instruction,
            generation_config=GENERATION_CONFIG,
        )
        response = model.generate_content(user_prompt)
    except Exception as exc:  # noqa: BLE001
        message = str(exc).lower()
        if "429" in message or "rate" in message or "quota" in message:
            raise AIRateLimitError(str(exc)) from exc
        raise AIServiceError(str(exc)) from exc

    text = (response.text or "").strip()
    if not text:
        raise AIServiceError("Empty response from Gemini")
    return text


def generate_perfume_reading(stone_slugs: list[str], gender: str | None) -> str:
    gender_label = gender or "prefer_not_to_say"
    prompt = f"Stones: {', '.join(stone_slugs)}. Gender: {gender_label}."
    return _call(_PERFUME_SYSTEM, prompt)


def generate_personality_reading(stone_slugs: list[str]) -> str:
    prompt = f"Stones: {', '.join(stone_slugs)}."
    return _call(_PERSONALITY_SYSTEM, prompt)
```

### Task 3.3: Write pytest for prompt-building logic

**File:** `backend/tests/test_gemini_service.py`

Test that without the API key, `generate_*` raise `AIConfigurationError` (does NOT mock the actual Gemini call — we just verify the guard rail):

```python
import os

import pytest

from app.services import gemini


def test_perfume_raises_without_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(gemini.AIConfigurationError):
        gemini.generate_perfume_reading(["amethyst"], "female")


def test_personality_raises_without_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(gemini.AIConfigurationError):
        gemini.generate_personality_reading(["amethyst"])
```

**Run:** `cd backend && pytest tests/test_gemini_service.py -v`
**Expected:** 2 passed.

### Task 3.4: Commit phase 3

```bash
git add backend/app/services/ backend/tests/test_gemini_service.py
git commit -m "ai-readings: Gemini service wrapper + configuration-guard tests"
```

---

## Phase 4 — Backend router: `/ai/readings`

### Task 4.1: Create the AI router

**File:** `backend/app/routers/ai.py`

```python
"""POST/GET /ai/readings — generate or list AI readings for the current user."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user
from ..db import get_db
from ..services import gemini

router = APIRouter(prefix="/ai", tags=["ai"])

VALID_KINDS = {"perfume", "personality"}
MAX_LIMIT = 50


def _normalised_slugs(slugs: list[str], db: Session) -> list[str]:
    cleaned = sorted({s.strip().lower() for s in slugs if s and s.strip()})
    if not 1 <= len(cleaned) <= 3:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Pick 1-3 stones")
    rows = db.execute(
        select(models.Article.slug).where(models.Article.slug.in_(cleaned))
    ).scalars().all()
    found = set(rows)
    missing = [s for s in cleaned if s not in found]
    if missing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown stones: {missing}")
    return cleaned


@router.post("/readings", response_model=schemas.AIReadingOut)
def create_reading(
    payload: schemas.AIReadingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    slugs = _normalised_slugs(payload.stone_slugs, db)
    slugs_str = ",".join(slugs)
    gender = current_user.gender

    existing = db.execute(
        select(models.AIReading).where(
            models.AIReading.user_id == current_user.id,
            models.AIReading.kind == payload.kind.value,
            models.AIReading.stone_slugs == slugs_str,
            models.AIReading.gender_at_time == gender,
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    try:
        if payload.kind.value == "perfume":
            content = gemini.generate_perfume_reading(slugs, gender)
        else:
            content = gemini.generate_personality_reading(slugs)
    except gemini.AIConfigurationError as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "AI features not configured"
        ) from exc
    except gemini.AIRateLimitError as exc:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "AI rate limit — try again in a moment",
        ) from exc
    except gemini.AIServiceError as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY, "AI service unavailable"
        ) from exc

    reading = models.AIReading(
        user_id=current_user.id,
        kind=payload.kind.value,
        stone_slugs=slugs_str,
        gender_at_time=gender,
        content=content,
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading


@router.get("/readings", response_model=list[schemas.AIReadingOut])
def list_readings(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    limit = max(1, min(limit, MAX_LIMIT))
    rows = db.execute(
        select(models.AIReading)
        .where(models.AIReading.user_id == current_user.id)
        .order_by(models.AIReading.created_at.desc())
        .limit(limit)
    ).scalars().all()
    return rows
```

### Task 4.2: Mount the router

**File:** `backend/app/main.py`

In the imports block, add:
```python
from .routers import ai
```

After the existing `app.include_router(...)` calls:
```python
app.include_router(ai.router)
```

### Task 4.3: Write integration tests

**File:** `backend/tests/test_ai_router.py`

Use the existing pytest fixtures pattern from `tests/test_articles.py` (auth, db, client). Tests:

```python
def test_unauthorized_create_returns_401(client):
    r = client.post("/ai/readings", json={"kind": "perfume", "stone_slugs": ["amethyst"]})
    assert r.status_code == 401


def test_invalid_kind_returns_422(client, admin_token):
    r = client.post(
        "/ai/readings",
        json={"kind": "horoscope", "stone_slugs": ["amethyst"]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 422


def test_zero_stones_returns_400_or_422(client, admin_token):
    r = client.post(
        "/ai/readings",
        json={"kind": "perfume", "stone_slugs": []},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code in (400, 422)


def test_too_many_stones_returns_400_or_422(client, admin_token):
    r = client.post(
        "/ai/readings",
        json={"kind": "perfume", "stone_slugs": ["a", "b", "c", "d"]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code in (400, 422)


def test_unknown_stone_returns_404(client, admin_token):
    r = client.post(
        "/ai/readings",
        json={"kind": "perfume", "stone_slugs": ["unicorn-quartz"]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 404


def test_list_empty_for_new_user(client, regular_token):
    r = client.get(
        "/ai/readings", headers={"Authorization": f"Bearer {regular_token}"}
    )
    assert r.status_code == 200
    assert r.json() == []


def test_no_gemini_key_returns_503(monkeypatch, client, admin_token):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    r = client.post(
        "/ai/readings",
        json={"kind": "perfume", "stone_slugs": ["amethyst"]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 503
```

(If existing test fixtures don't expose `admin_token` / `regular_token`, add them following the existing pattern in `tests/conftest.py`.)

**Run:** `cd backend && pytest tests/test_ai_router.py -v`
**Expected:** all pass.

### Task 4.4: Commit phase 4

```bash
git add backend/app/routers/ai.py backend/app/main.py backend/tests/test_ai_router.py
git commit -m "ai-readings: POST/GET /ai/readings with dedupe + integration tests"
```

---

## Phase 5 — Frontend API client

### Task 5.1: Add `marked` dependency

```bash
cd frontend && npm install marked
```

### Task 5.2: Create readings API client

**File:** `frontend/src/api/readings.js`

```javascript
import client from './client.js';

export async function createReading({ kind, stoneSlugs }) {
    const { data } = await client.post('/ai/readings', {
        kind,
        stone_slugs: stoneSlugs,
    });
    return data;
}

export async function listReadings(limit = 20) {
    const { data } = await client.get('/ai/readings', { params: { limit } });
    return data;
}
```

### Task 5.3: Update users API client to pass gender

**File:** `frontend/src/api/users.js`

No structural changes needed — the existing `createUser` / `updateUser` already forward whatever payload they receive. Just verify that callers pass `gender` when relevant.

### Task 5.4: Commit phase 5

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/api/readings.js
git commit -m "ai-readings: frontend API client + marked dependency"
```

---

## Phase 6 — Frontend components

### Task 6.1: Create `StonePicker`

**File:** `frontend/src/components/StonePicker.jsx`

```jsx
import { getStoneImageUrl } from '../utils/stoneImages.js';

const STONES = [
    { slug: 'rose-quartz', title: 'Rose Quartz' },
    { slug: 'aventurine', title: 'Aventurine' },
    { slug: 'amethyst', title: 'Amethyst' },
    { slug: 'black-tourmaline', title: 'Black Tourmaline' },
    { slug: 'lapis-lazuli', title: 'Lapis Lazuli' },
    { slug: 'citrine', title: 'Citrine' },
    { slug: 'moonstone', title: 'Moonstone' },
    { slug: 'tigers-eye', title: "Tiger's Eye" },
    { slug: 'selenite', title: 'Selenite' },
    { slug: 'carnelian', title: 'Carnelian' },
];

const MAX_SELECT = 3;

export default function StonePicker({ selected, onToggle, disabled = false }) {
    const handleClick = (slug) => {
        if (disabled) return;
        const isSelected = selected.includes(slug);
        if (isSelected) {
            onToggle(selected.filter((s) => s !== slug));
            return;
        }
        if (selected.length >= MAX_SELECT) return;
        onToggle([...selected, slug]);
    };

    return (
        <div className="stone-picker">
            <p className="stone-picker__hint">
                {`Pick up to ${MAX_SELECT} stones — you have selected ${selected.length}.`}
            </p>
            <div className="stone-picker__grid">
                {STONES.map((stone) => {
                    const isSelected = selected.includes(stone.slug);
                    const cap = !isSelected && selected.length >= MAX_SELECT;
                    return (
                        <button
                            type="button"
                            key={stone.slug}
                            className={
                                isSelected
                                    ? 'stone-picker__card stone-picker__card--selected'
                                    : 'stone-picker__card'
                            }
                            onClick={() => handleClick(stone.slug)}
                            disabled={disabled || cap}
                            aria-pressed={isSelected}
                        >
                            <img
                                className="stone-picker__thumb"
                                src={getStoneImageUrl(stone.slug)}
                                alt={`${stone.title} illustration`}
                                loading="lazy"
                            />
                            <span className="stone-picker__name">{stone.title}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
```

### Task 6.2: Create `ReadingResult`

**File:** `frontend/src/components/ReadingResult.jsx`

```jsx
import { useMemo } from 'react';
import { marked } from 'marked';

import { formatDate } from '../utils/format.js';

marked.setOptions({ gfm: true, breaks: false });

export default function ReadingResult({ reading }) {
    const html = useMemo(
        () => marked.parse(reading.content || ''),
        [reading.content],
    );

    const stoneLabel = (reading.stone_slugs || []).join(' · ');
    const dateLabel = formatDate(reading.created_at);
    const kindLabel = reading.kind === 'perfume' ? 'Perfume' : 'Personality';

    return (
        <article className="reading-result">
            <header className="reading-result__header">
                <span className={`badge badge--role-${reading.kind === 'perfume' ? 'admin' : 'regular'}`}>
                    {kindLabel}
                </span>
                <span className="reading-result__meta">
                    {stoneLabel}
                    {' · '}
                    {dateLabel}
                </span>
            </header>
            {/* eslint-disable-next-line react/no-danger */}
            <div className="reading-result__body" dangerouslySetInnerHTML={{ __html: html }} />
            <p className="reading-result__disclaimer">
                AI-generated — verify before buying.
            </p>
        </article>
    );
}
```

### Task 6.3: Commit phase 6 components

```bash
git add frontend/src/components/StonePicker.jsx frontend/src/components/ReadingResult.jsx
git commit -m "ai-readings: StonePicker + ReadingResult components"
```

---

## Phase 7 — Frontend pages & wiring

### Task 7.1: Create `ReadingPage`

**File:** `frontend/src/pages/ReadingPage.jsx`

```jsx
import { useState } from 'react';

import { createReading } from '../api/readings.js';
import Alert from '../components/Alert.jsx';
import ReadingResult from '../components/ReadingResult.jsx';
import Spinner from '../components/Spinner.jsx';
import StonePicker from '../components/StonePicker.jsx';

const MODES = [
    { key: 'perfume', label: 'Get your perfume' },
    { key: 'personality', label: 'Get your personality reading' },
];

export default function ReadingPage() {
    const [mode, setMode] = useState('perfume');
    const [selected, setSelected] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [reading, setReading] = useState(null);

    const canSubmit = selected.length >= 1 && !busy;

    const handleGenerate = async () => {
        setBusy(true);
        setError('');
        setReading(null);
        try {
            const data = await createReading({ kind: mode, stoneSlugs: selected });
            setReading(data);
        } catch (caught) {
            setError(caught?.message || 'Could not generate the reading.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="page-reading" aria-labelledby="reading-title">
            <h1 id="reading-title" className="page-reading__title">Your stone reading</h1>
            <p className="page-reading__subtitle">
                Pick a mode and 1–3 stones. The reading is generated for you and
                saved to your profile.
            </p>

            <div className="page-reading__mode-toggle" role="tablist">
                {MODES.map((m) => (
                    <button
                        key={m.key}
                        type="button"
                        role="tab"
                        aria-selected={mode === m.key}
                        className={
                            mode === m.key
                                ? 'btn btn--primary'
                                : 'btn btn--secondary'
                        }
                        onClick={() => setMode(m.key)}
                        disabled={busy}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            <StonePicker
                selected={selected}
                onToggle={setSelected}
                disabled={busy}
            />

            <div className="form-actions">
                <button
                    type="button"
                    className="btn btn--primary"
                    onClick={handleGenerate}
                    disabled={!canSubmit}
                >
                    {busy ? 'Generating…' : 'Generate'}
                </button>
            </div>

            {busy && <Spinner label="Consulting the stones…" />}

            {error && (
                <Alert variant="danger" title="Couldn't generate the reading">
                    {error}
                </Alert>
            )}

            {reading && <ReadingResult reading={reading} />}
        </section>
    );
}
```

### Task 7.2: Add the `/my-reading` route

**File:** `frontend/src/App.jsx`

In the imports add:
```javascript
import ReadingPage from './pages/ReadingPage.jsx';
```

In the `<Routes>` block, between `/login` and the `/users` route, add:
```jsx
<Route
    path="/my-reading"
    element={(
        <ProtectedRoute>
            <ReadingPage />
        </ProtectedRoute>
    )}
/>
```

### Task 7.3: Add "My reading" link to SiteHeader

**File:** `frontend/src/components/SiteHeader.jsx`

Add the link right after Home, visible whenever `user` is truthy:
```jsx
{user && (
    <NavLink
        className={({ isActive }) => (
            isActive
                ? 'site-nav__link site-nav__link--active'
                : 'site-nav__link'
        )}
        to="/my-reading"
    >
        My reading
    </NavLink>
)}
```

### Task 7.4: Add gender field to UserForm

**File:** `frontend/src/components/UserForm.jsx`

Update `INITIAL_DRAFT`:
```javascript
const INITIAL_DRAFT = {
    username: '',
    password: '',
    confirm: '',
    role: 'regular',
    gender: '',
};
```

Update `validate(...)` to accept any gender value or empty.

Update `buildSubmitPayload(...)` to include `gender` when non-empty:
```javascript
if (draft.gender) {
    payload.gender = draft.gender;
}
```

Add a new `<div className="form-field">` after the role select:
```jsx
<div className="form-field">
    <label className="form-field__label" htmlFor="user-form-gender">Gender</label>
    <select
        className="form-select"
        id="user-form-gender"
        value={draft.gender}
        onChange={handleChange('gender')}
    >
        <option value="">Prefer not to say</option>
        <option value="female">Female</option>
        <option value="male">Male</option>
        <option value="prefer_not_to_say">Prefer not to say (explicit)</option>
    </select>
    <p className="form-field__hint">
        Optional — used to tailor perfume suggestions.
    </p>
</div>
```

In `buildInitialDraft(...)`, ensure `gender` is preserved from `initialValues`.

### Task 7.5: Add "My readings" section to profile

**File:** `frontend/src/pages/UserDetailPage.jsx`

Import:
```javascript
import { listReadings } from '../api/readings.js';
import ReadingResult from '../components/ReadingResult.jsx';
```

Add state:
```javascript
const [readings, setReadings] = useState([]);
const [readingsLoading, setReadingsLoading] = useState(true);
```

Add a second `useEffect` after the existing one:
```javascript
useEffect(() => {
    if (!currentUser || currentUser.id !== id) {
        setReadingsLoading(false);
        return undefined;
    }
    let cancelled = false;
    async function load() {
        setReadingsLoading(true);
        try {
            const data = await listReadings();
            if (!cancelled) setReadings(data);
        } catch (_) {
            if (!cancelled) setReadings([]);
        } finally {
            if (!cancelled) setReadingsLoading(false);
        }
    }
    load();
    return () => {
        cancelled = true;
    };
}, [id, currentUser]);
```

In the render output, after the existing `.page-user-detail__actions` block, add (only for the user themselves):

```jsx
{currentUser && currentUser.id === user.id && (
    <section className="page-user-detail__readings" aria-labelledby="readings-title">
        <h2 id="readings-title" className="page-user-detail__readings-title">My readings</h2>
        {readingsLoading && <Spinner label="Loading readings…" />}
        {!readingsLoading && readings.length === 0 && (
            <p className="page-user-detail__readings-empty">
                You haven&apos;t generated any readings yet. Try one on the
                {' '}
                <Link to="/my-reading">My reading</Link>
                {' '}
                page.
            </p>
        )}
        {!readingsLoading && readings.map((r) => (
            <ReadingResult key={r.id} reading={r} />
        ))}
    </section>
)}
```

### Task 7.6: Add CSS for the new components

**File:** `frontend/src/styles/spa.css`

Append rules for `.page-reading`, `.page-reading__mode-toggle`, `.stone-picker`, `.stone-picker__grid`, `.stone-picker__card`, `.stone-picker__card--selected`, `.stone-picker__thumb`, `.stone-picker__name`, `.reading-result`, `.reading-result__header`, `.reading-result__meta`, `.reading-result__body`, `.reading-result__disclaimer`, `.page-user-detail__readings`, `.page-user-detail__readings-title`, `.page-user-detail__readings-empty`. Use the existing site palette (`#6a3aa6` primary, `#fbe8e4` etc.).

### Task 7.7: Run lint + build

```bash
cd frontend
npm run lint
npm run build
```

**Expected:** lint silent, build succeeds in < 5 s.

### Task 7.8: Commit phase 7

```bash
git add frontend/src/pages/ReadingPage.jsx \
        frontend/src/pages/UserDetailPage.jsx \
        frontend/src/App.jsx \
        frontend/src/components/SiteHeader.jsx \
        frontend/src/components/UserForm.jsx \
        frontend/src/styles/spa.css
git commit -m "ai-readings: /my-reading page + nav link + gender field + profile history"
```

---

## Phase 8 — End-to-end smoke

### Task 8.1: Start backend locally with GEMINI_API_KEY

```bash
cd backend
source .venv/bin/activate
GEMINI_API_KEY=<the-real-key-from-Anastasia> \
CORS_ORIGINS="http://localhost:5173,http://localhost:8000" \
uvicorn app.main:app --reload --port 8002
```

(Anastasia has the key locally; she can paste it on the command line for the smoke. Render already has it set in env.)

### Task 8.2: Start Vite locally

```bash
cd frontend && npm run dev
```

### Task 8.3: Browser smoke checklist

Using the Claude Preview MCP:

1. Open `/login` → log in as `admin` / `admin123`.
2. Top nav shows "My reading" link.
3. Click it → `/my-reading`. Mode toggle defaults to Perfume; no stones selected.
4. Click Generate while disabled → nothing happens (good).
5. Pick Amethyst → button enables. Click Generate → spinner → result appears with the perfume prose + 2 brand picks.
6. Click "Get your personality reading" → click Generate → result appears with three `## …` sections.
7. Open `/users/<admin-id>` → "My readings" section lists 2 readings, newest first.
8. Pick the same stone + same mode → Generate → instant return (cache hit; verify in DevTools that the request completed in < 200 ms).
9. Open in a second browser tab → cmd+r on `/my-reading` → page reloads (SPA fallback fix from earlier still works).
10. Console must be empty (no errors / warnings).

### Task 8.4: Production smoke

After deploying (next phase), repeat with `https://stones-and-scents.vercel.app/my-reading`.

---

## Phase 9 — Commit, push, deploy

### Task 9.1: Push feature branch

```bash
git push origin feature-ai-readings
```

### Task 9.2: Open PR feature → development

```bash
gh pr create --base development --head feature-ai-readings \
    --title "AI stone readings (perfume + personality, Gemini Flash)" \
    --body "<see body below>"
```

PR body should include the design-doc link, the smoke checklist results, screenshots, and the Supabase migration confirmation.

### Task 9.3: Merge with merge-commit

```bash
gh pr merge <PR#> --merge
```

### Task 9.4: Promote development → main

```bash
gh pr create --base main --head development \
    --title "Promote: AI stone readings → main" \
    --body "Brings PR <previous PR#> into main; Render + Vercel auto-deploy."
gh pr merge <PR#> --merge
```

### Task 9.5: Wait for auto-deploys

- Vercel: ~45 s
- Render: ~2 min (rebuilds since `requirements.txt` changed)

### Task 9.6: Production smoke

Hit `https://stones-and-scents.vercel.app/my-reading` and repeat Phase 8 step 3-9 on the live URL. Curl-verify the endpoints exist:

```bash
TOKEN=$(curl -s -X POST https://stones-and-scents.vercel.app/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' \
    | python3 -c "import sys, json; print(json.loads(sys.stdin.read())['access_token'])")

curl -s -X POST https://stones-and-scents.vercel.app/api/ai/readings \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"kind":"perfume","stone_slugs":["amethyst"]}' | python3 -m json.tool
```

Expect a `content` field with the generated reading.

---

## Phase 10 — Memory + done

### Task 10.1: Update project memory

Edit `~/.claude/projects/-Users-mac-uni-2-kurs------/memory/project_webdev_labs.md`:
- Note `feature-ai-readings` branch + its PR numbers
- Note Gemini key is in Render env
- Note Supabase migration applied 2026-05-11

### Task 10.2: Update LAB3.md (optional)

Add a footer section noting the bonus AI features are live, with how to demo.

---

## Estimated effort

| Phase | Time |
|---|---|
| 1 | 1 min (Anastasia runs SQL) |
| 2 | 10 min |
| 3 | 15 min |
| 4 | 25 min (router + tests) |
| 5 | 5 min |
| 6 | 20 min (components + CSS prep) |
| 7 | 30 min (pages + nav + form + profile + CSS) |
| 8 | 15 min (local smoke) |
| 9 | 10 min (push + PRs + deploy) |
| 10 | 5 min |
| **Total** | **~2 hours of focused work** |

---

## Risk register

| Risk | Mitigation |
|---|---|
| Gemini hallucinates perfume names | `temperature=0`, "fall back to classics" in prompt, UI disclaimer |
| Supabase migration not applied before backend deploy | Backend tolerant: existing endpoints unaffected; only `/ai/*` fails until migration runs |
| Free-tier rate limit hit during demo | Dedupe cache makes repeat calls free; ~30 calls/demo is well under 1500/day |
| `marked` XSS via stylistic markdown | `marked` escapes raw HTML by default; LLM output is server-trusted |
| Existing users (admin, regular) confused by NULL gender | Backend treats NULL = `prefer_not_to_say`, no nag UX needed |

---

Plan complete. Ready to execute.
