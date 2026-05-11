# Lab 4 — Variant-5 Functionality Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the React SPA with the Variant-5 article-moderation workflow plus all supporting CRUD and admin tooling, satisfying Lab 4's 25-point rubric.

**Architecture:** FastAPI gains three new endpoint groups (`/tags`, `/uploads`, `GET /articles/{slug}/history`) plus a Supabase Storage service wrapper with a local-fs fallback. React SPA gains five new pages (ArticleEditor, ArticleHistory, ModerationQueue, Profile, TagsAdmin), eight new components, two new utils, and an MSW scaffold (devDep only) for Lab 5's tests. Strict role split: admins direct-publish via PUT/POST `/articles`, regulars go through the FIFO `/edits` queue with stale-detection.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic v2, Supabase (Postgres + Storage), React 18, Vite, React Router v6, axios, AirBnB ESLint, MSW v2 (devDep), pytest.

**Design doc:** `docs/plans/2026-05-11-lab4-variant5-functionality-design.md`

**Hard rules to obey:**
- Files ≤ 400 LOC, functions ≤ 75 LOC, AirBnB style, four-space JS indent.
- Verify `gh auth status` shows `kpchknst` active before any push.
- Never paste secrets in chat or commit them — use `backend/.env` only.
- Commit on every TDD green, never bundle steps.
- Stop and ask the user before starting Phase 2 (Hard Rule 4: doc-first).

---

## Phase 0 — Pre-flight (already done in this session)

- [x] Branch `lab4` created off latest `development` (sha at branch point: `34fc3f6`).
- [x] Design doc committed (`400b2f6`).
- [x] Verified backend tests 36/36 green, frontend lint clean, build 284 KB JS / 92 KB gzip, all live deploys 200.

---

## Phase 1 — Documentation first (Hard Rule 4 — STOP after this phase)

### Task 1.1: Write `docs/lab4-guide.md`

**Files:**
- Create: `web/docs/lab4-guide.md`

**Step 1:** Draft the step-by-step build guide for Anastasia. Sections:
1. Prerequisites (branch checkout, env vars, Supabase Storage bucket creation).
2. Backend changes (each new file with full code excerpts and where to paste).
3. Frontend changes (each new component/page with code excerpts).
4. How to run locally (`uvicorn` + `npm run dev` commands, expected URLs).
5. How to verify (manual smoke checklist matching design doc Section 7.3).

**Step 2:** Commit.

```bash
git add docs/lab4-guide.md
git commit -m "lab4: build guide for Variant-5 functionality"
```

### Task 1.2: Write `docs/lab4-report.md`

**Files:**
- Create: `web/docs/lab4-report.md`

**Step 1:** Draft the teacher-facing report. Sections:
1. Spec requirements (quote from screenshot: "Add project specific functionality to SPA, max 25 points, all features shall be implemented").
2. Variant-5 deliverable list with implementation pointers (file/line).
3. Demo flow (the 8-step manual smoke).
4. Screenshots placeholder section (`_TBD: insert screenshot of …_`) — Anastasia will paste real screenshots after smoke.
5. Quality metrics (lint result, build size, test counts) — placeholders to fill after implementation.

**Step 2:** Commit.

```bash
git add docs/lab4-report.md
git commit -m "lab4: teacher-facing report skeleton (metrics filled post-impl)"
```

### Task 1.3: Write `LAB4.md` root quick-start

**Files:**
- Create: `web/LAB4.md`

**Step 1:** Draft a one-screen quick-start. Mirror `LAB3.md`'s structure: what's in this branch, two-command setup, 60-second demo path.

**Step 2:** Commit.

```bash
git add LAB4.md
git commit -m "lab4: root-level quick-start"
```

### Task 1.4: Update the master design doc

**Files:**
- Modify: `web/docs/plans/2026-05-06-stones-encyclopedia-design.md` Sections 4, 7, 11.

**Step 1:** Edit Section 4 — bump screen count 11 → 16; add the 5 new screens.
**Step 2:** Edit Section 7 — replace the high-level Lab 4 paragraph with a back-pointer: *"See `2026-05-11-lab4-variant5-functionality-design.md` for the locked Lab 4 design."*
**Step 3:** Edit Section 11 — close cover-image open item: *"Decided 2026-05-11 (Lab 4): hybrid — URL field + optional drag-and-drop upload via backend `POST /uploads` proxy to Supabase Storage."*
**Step 4:** Commit.

```bash
git add docs/plans/2026-05-06-stones-encyclopedia-design.md
git commit -m "docs: lock Lab 4 design decisions in master design doc"
```

### Task 1.5 — STOP

Post the file list to the user with the message:

> *"Lab 4 docs landed (4 commits on `lab4`). Ready to implement Phase 2 (backend)? Will need a Supabase Storage bucket — should I run the bucket-create CLI now or do you want to do it from the Supabase dashboard?"*

**Wait for explicit approval before proceeding to Phase 2.**

---

## Phase 2 — Backend (TDD)

### Task 2.1: Tags router — failing test

**Files:**
- Create: `web/backend/tests/test_tags.py`

**Step 1:** Write failing tests:

```python
# test_tags.py
def test_list_tags_public(client):
    r = client.get("/tags")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_create_tag_requires_admin(client, regular_token):
    r = client.post("/tags", json={"name": "Test", "slug": "test"},
                    headers={"Authorization": f"Bearer {regular_token}"})
    assert r.status_code == 403


def test_create_tag_admin_ok(client, admin_token):
    r = client.post("/tags", json={"name": "Test", "slug": "test-tag"},
                    headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 201
    assert r.json()["slug"] == "test-tag"


def test_create_tag_slug_conflict(client, admin_token):
    client.post("/tags", json={"name": "X", "slug": "dup"},
                headers={"Authorization": f"Bearer {admin_token}"})
    r = client.post("/tags", json={"name": "Y", "slug": "dup"},
                    headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 409


def test_update_tag(client, admin_token):
    created = client.post("/tags", json={"name": "Old", "slug": "old"},
                          headers={"Authorization": f"Bearer {admin_token}"}).json()
    r = client.put(f"/tags/{created['id']}", json={"name": "New"},
                   headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    assert r.json()["name"] == "New"


def test_delete_tag(client, admin_token):
    created = client.post("/tags", json={"name": "Z", "slug": "z"},
                          headers={"Authorization": f"Bearer {admin_token}"}).json()
    r = client.delete(f"/tags/{created['id']}",
                      headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 204
```

**Step 2:** Run — expect failures.

```bash
cd backend && source .venv/bin/activate && pytest tests/test_tags.py -v
```

Expected: 6 failures (router not registered).

### Task 2.2: Tags router — implementation

**Files:**
- Create: `web/backend/app/routers/tags.py`
- Modify: `web/backend/app/schemas.py` (add `TagCreate`, `TagUpdate`)
- Modify: `web/backend/app/main.py` (register router with prefix `/tags`)

**Step 1:** Add schemas:

```python
# schemas.py addition
class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    slug: str = Field(..., min_length=1, max_length=50, pattern=r"^[a-z0-9-]+$")


class TagUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    slug: Optional[str] = Field(None, min_length=1, max_length=50, pattern=r"^[a-z0-9-]+$")
```

**Step 2:** Implement `tags.py` (~75 LOC) — mirror `articles.py` shape: GET list (public), POST/PUT/DELETE admin-gated, return 409 on slug conflict, 404 on missing id.

**Step 3:** Register in `main.py`: `app.include_router(tags.router, prefix="/tags", tags=["tags"])`.

**Step 4:** Run tests.

```bash
pytest tests/test_tags.py -v
```

Expected: 6 PASS.

**Step 5:** Commit.

```bash
git add backend/app/routers/tags.py backend/app/schemas.py backend/app/main.py backend/tests/test_tags.py
git commit -m "lab4: backend tags CRUD with admin gating"
```

### Task 2.3: Article history endpoint — failing test

**Files:**
- Create: `web/backend/tests/test_history.py`

**Step 1:** Write failing tests:

```python
def test_history_returns_only_approved_in_order(client, admin_token, regular_token, seeded_article_slug):
    # Propose two edits, approve in order
    edit1 = client.post(f"/articles/{seeded_article_slug}/edits",
                        json={"proposed_title": "T1", "proposed_content": "c1", "base_version": 1},
                        headers={"Authorization": f"Bearer {regular_token}"}).json()
    client.post(f"/edits/{edit1['id']}/approve",
                headers={"Authorization": f"Bearer {admin_token}"})
    edit2 = client.post(f"/articles/{seeded_article_slug}/edits",
                        json={"proposed_title": "T2", "proposed_content": "c2", "base_version": 2},
                        headers={"Authorization": f"Bearer {regular_token}"}).json()
    client.post(f"/edits/{edit2['id']}/approve",
                headers={"Authorization": f"Bearer {admin_token}"})

    r = client.get(f"/articles/{seeded_article_slug}/history")
    assert r.status_code == 200
    history = r.json()
    assert len(history) == 2
    assert history[0]["proposed_title"] == "T1"
    assert history[1]["proposed_title"] == "T2"


def test_history_excludes_pending_and_rejected(client, admin_token, regular_token, seeded_article_slug):
    pending_edit = client.post(f"/articles/{seeded_article_slug}/edits",
                               json={"proposed_title": "Pending", "proposed_content": "p", "base_version": 1},
                               headers={"Authorization": f"Bearer {regular_token}"}).json()
    rej_edit = client.post(f"/articles/{seeded_article_slug}/edits",
                           json={"proposed_title": "Rej", "proposed_content": "r", "base_version": 1},
                           headers={"Authorization": f"Bearer {regular_token}"}).json()
    client.post(f"/edits/{rej_edit['id']}/reject", json={"reason": "no"},
                headers={"Authorization": f"Bearer {admin_token}"})
    r = client.get(f"/articles/{seeded_article_slug}/history")
    assert r.status_code == 200
    titles = [e["proposed_title"] for e in r.json()]
    assert "Pending" not in titles
    assert "Rej" not in titles


def test_history_404_unknown_slug(client):
    r = client.get("/articles/does-not-exist/history")
    assert r.status_code == 404
```

**Step 2:** Run — expect failures.

```bash
pytest tests/test_history.py -v
```

### Task 2.4: Article history endpoint — implementation

**Files:**
- Modify: `web/backend/app/routers/articles.py` — add `GET /{slug}/history`.

**Step 1:** Add the endpoint (~15 LOC):

```python
@router.get("/{slug}/history", response_model=list[EditOut])
def article_history(slug: str, db: Session = Depends(get_db)):
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
```

**Step 2:** Add the necessary imports (`ArticleEdit`, `EditOut`).

**Step 3:** Run tests.

```bash
pytest tests/test_history.py -v
```

Expected: 3 PASS.

**Step 4:** Commit.

```bash
git add backend/app/routers/articles.py backend/tests/test_history.py
git commit -m "lab4: GET /articles/{slug}/history (approved edits only)"
```

### Task 2.5: Storage service — failing test

**Files:**
- Create: `web/backend/tests/test_uploads.py`
- Create: `web/backend/tests/conftest_storage.py` (or extend `conftest.py`) — mock the storage backend so tests don't need real Supabase.

**Step 1:** Write failing tests:

```python
def test_upload_requires_admin(client, regular_token, fake_image_jpg):
    r = client.post("/uploads",
                    files={"file": ("a.jpg", fake_image_jpg, "image/jpeg")},
                    headers={"Authorization": f"Bearer {regular_token}"})
    assert r.status_code == 403


def test_upload_admin_ok(client, admin_token, fake_image_jpg, mock_storage):
    r = client.post("/uploads",
                    files={"file": ("a.jpg", fake_image_jpg, "image/jpeg")},
                    headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 201
    assert "url" in r.json()


def test_upload_rejects_non_image(client, admin_token):
    r = client.post("/uploads",
                    files={"file": ("a.txt", b"hello", "text/plain")},
                    headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 415


def test_upload_rejects_large_file(client, admin_token):
    big = b"\xff" * (2 * 1024 * 1024 + 1)
    r = client.post("/uploads",
                    files={"file": ("big.jpg", big, "image/jpeg")},
                    headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 413


def test_upload_503_when_storage_misconfigured(client, admin_token, fake_image_jpg, monkeypatch):
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "")
    r = client.post("/uploads",
                    files={"file": ("a.jpg", fake_image_jpg, "image/jpeg")},
                    headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code in (503, 201)  # 201 if local-fs fallback; 503 if not
```

**Step 2:** Run — expect failures.

### Task 2.6: Storage service + uploads router — implementation

**Files:**
- Create: `web/backend/app/services/storage.py` (~80 LOC) — Supabase Storage wrapper with local-fs fallback.
- Create: `web/backend/app/routers/uploads.py` (~50 LOC).
- Modify: `web/backend/app/schemas.py` — add `UploadOut`.
- Modify: `web/backend/app/main.py` — register router.
- Modify: `web/backend/.env.example` — add `SUPABASE_SERVICE_KEY=` and `SUPABASE_STORAGE_BUCKET=article-covers`.
- Modify: `web/backend/requirements.txt` — add `supabase>=2.0` (only if not already present).

**Step 1:** Implement `storage.py`:

```python
"""Supabase Storage upload wrapper with local-fs fallback for offline demo."""

import os
import uuid
from pathlib import Path
from typing import Tuple

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 2 * 1024 * 1024  # 2 MB
LOCAL_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"


class StorageError(Exception):
    pass


def upload(file_bytes: bytes, mime: str, original_name: str) -> str:
    if mime not in ALLOWED_MIME:
        raise StorageError(f"unsupported mime {mime}")
    if len(file_bytes) > MAX_BYTES:
        raise StorageError("file too large")

    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[mime]
    key = f"{uuid.uuid4()}.{ext}"

    if os.getenv("USE_SQLITE") == "1" or not os.getenv("SUPABASE_SERVICE_KEY"):
        return _upload_local(file_bytes, key)
    return _upload_supabase(file_bytes, key, mime)


def _upload_local(file_bytes: bytes, key: str) -> str:
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    (LOCAL_DIR / key).write_bytes(file_bytes)
    return f"/uploads/{key}"


def _upload_supabase(file_bytes: bytes, key: str, mime: str) -> str:
    from supabase import create_client
    url = os.environ["SUPABASE_URL"]
    service_key = os.environ["SUPABASE_SERVICE_KEY"]
    bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "article-covers")
    sb = create_client(url, service_key)
    sb.storage.from_(bucket).upload(key, file_bytes, {"content-type": mime})
    return sb.storage.from_(bucket).get_public_url(key)
```

**Step 2:** Implement `routers/uploads.py`:

```python
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
```

**Step 3:** Add `UploadOut` schema:

```python
class UploadOut(BaseModel):
    url: str
```

**Step 4:** Register router with prefix `/uploads`. Mount static `/uploads` directory in `main.py` for the local-fs fallback:

```python
from fastapi.staticfiles import StaticFiles
from .services.storage import LOCAL_DIR
LOCAL_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(LOCAL_DIR)), name="uploads")
```

**Step 5:** Run tests.

```bash
pytest tests/test_uploads.py -v
```

Expected: 5 PASS (using local-fs fallback path; supabase client not actually called).

**Step 6:** Commit.

```bash
git add backend/app/services/storage.py backend/app/routers/uploads.py backend/app/schemas.py backend/app/main.py backend/.env.example backend/tests/test_uploads.py
git commit -m "lab4: backend POST /uploads with Supabase Storage + local-fs fallback"
```

### Task 2.7: Backend full sweep

**Step 1:** Run all backend tests.

```bash
cd backend && source .venv/bin/activate && pytest -v
```

Expected: ≥ 45 tests, all green.

**Step 2:** Manual smoke against local Supabase Session pooler:

```bash
uvicorn app.main:app --reload --port 8002
# open http://localhost:8002/docs and verify /tags, /uploads, /articles/{slug}/history
```

---

## Phase 3 — Frontend foundation

### Task 3.1: API modules

**Files:**
- Create: `web/frontend/src/api/tags.js`
- Create: `web/frontend/src/api/edits.js`
- Create: `web/frontend/src/api/uploads.js`
- Modify: `web/frontend/src/api/articles.js` — add `createArticle`, `updateArticle`, `deleteArticle`, `getArticleHistory`.

**Step 1:** Write each module — thin axios wrappers, no business logic.

```javascript
// tags.js
import client from './client.js';
export const listTags = async () => (await client.get('/tags')).data;
export const createTag = async (payload) => (await client.post('/tags', payload)).data;
export const updateTag = async (id, payload) => (await client.put(`/tags/${id}`, payload)).data;
export const deleteTag = async (id) => client.delete(`/tags/${id}`);
```

```javascript
// edits.js
import client from './client.js';
export const listEdits = async (params = {}) => (await client.get('/edits', { params })).data;
export const listMyEdits = async () => (await client.get('/me/edits')).data;
export const getEdit = async (id) => (await client.get(`/edits/${id}`)).data;
export const proposeEdit = async (slug, payload) =>
    (await client.post(`/articles/${encodeURIComponent(slug)}/edits`, payload)).data;
export const approveEdit = async (id) => (await client.post(`/edits/${id}/approve`)).data;
export const rejectEdit = async (id, reason) =>
    (await client.post(`/edits/${id}/reject`, { reason })).data;
```

```javascript
// uploads.js
import client from './client.js';
export const uploadCover = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await client.post('/uploads', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url;
};
```

**Step 2:** Extend `articles.js`:

```javascript
export const createArticle = async (payload) => (await client.post('/articles', payload)).data;
export const updateArticle = async (slug, payload) =>
    (await client.put(`/articles/${encodeURIComponent(slug)}`, payload)).data;
export const deleteArticle = async (slug) =>
    client.delete(`/articles/${encodeURIComponent(slug)}`);
export const getArticleHistory = async (slug) =>
    (await client.get(`/articles/${encodeURIComponent(slug)}/history`)).data;
```

**Step 3:** Lint + commit.

```bash
cd frontend && npm run lint
git add frontend/src/api/
git commit -m "lab4: frontend api modules for tags, edits, uploads, articles CRUD"
```

### Task 3.2: Utils

**Files:**
- Create: `web/frontend/src/utils/diff.js`
- Create: `web/frontend/src/utils/slugify.js`

**Step 1:** Implement `diff.js` (~60 LOC) — line-by-line LCS returning `{ left: [{type:'context'|'del', text}], right: [{type:'context'|'add', text}] }`.

**Step 2:** Implement `slugify.js`:

```javascript
export default function slugify(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 80);
}
```

**Step 3:** Lint + commit.

```bash
git add frontend/src/utils/
git commit -m "lab4: frontend utils — diff (LCS) and slugify"
```

### Task 3.3: Reusable components (one commit per component)

**Files (each Create):**
- `web/frontend/src/components/CharCounter.jsx`
- `web/frontend/src/components/SearchBox.jsx`
- `web/frontend/src/components/TagFilter.jsx`
- `web/frontend/src/components/EditCard.jsx`
- `web/frontend/src/components/DiffView.jsx`
- `web/frontend/src/components/EditConflictBanner.jsx`
- `web/frontend/src/components/RejectModal.jsx`
- `web/frontend/src/components/CoverImageInput.jsx`

For each component, repeat:
1. Write the component (≤ 100 LOC each).
2. Lint clean.
3. Commit: `git commit -m "lab4: <ComponentName> component"`.

Notes per component:

- **CharCounter** — props `{value, max}`. Tier coloring: 0–89% grey, 90–99% amber, 100% red.
- **SearchBox** — controlled input with 300 ms debounce; emits `onChange(value)`.
- **TagFilter** — fetches tags; renders chips; multi-select stored in URL query string via `useSearchParams`.
- **EditCard** — compact summary of one `EditOut`: status badge, editor username, submitted_at, action buttons by role.
- **DiffView** — props `{oldText, newText}`. Renders two columns side-by-side; uses `utils/diff.js`.
- **EditConflictBanner** — props `{pendingEdits, articleSlug}`. Yellow banner with editor names and a *See pending edit* link to `/moderation/{id}` (admin) or a read-only modal (regular).
- **RejectModal** — wraps existing `ConfirmModal` with a `<textarea>` for reason; calls `onConfirm(reason)`.
- **CoverImageInput** — props `{value, onChange}`. Renders URL textbox + drop zone. On drop validates client-side then calls `uploadCover(file)`. Shows preview thumbnail.

### Task 3.4: SCSS for new components

**Files:**
- Modify: `web/frontend/src/styles/spa.css` — append new rules for the 8 components plus the new pages. Or create per-component blocks if file approaches 400 LOC.

**Step 1:** Add rules. Reuse existing tokens (colors, spacings) from current `spa.css`.

**Step 2:** Commit.

```bash
git add frontend/src/styles/spa.css
git commit -m "lab4: styles for new components (counter, diff, conflict banner, etc.)"
```

---

## Phase 4 — Frontend pages (one PR-worthy commit per page)

### Task 4.1: ArticleEditorPage

**Files:**
- Create: `web/frontend/src/pages/ArticleEditorPage.jsx` (≤ 350 LOC; if larger, extract `ArticleEditorForm.jsx`).
- Modify: `web/frontend/src/App.jsx` — register `/articles/new` (admin) and `/articles/:slug/edit` (auth).

**Step 1:** Implement: detect mode from `useParams().slug`. In edit mode, fetch article + pending edits. Role-aware CTA:
- admin → "Save changes" → `updateArticle(slug, ...)` or `createArticle(...)`.
- regular → "Propose edit" → `proposeEdit(slug, { proposed_title, proposed_content, base_version })`.

Wires `CharCounter`, `EditConflictBanner`, `CoverImageInput`, `TagFilter` (single-select from tags).

**Step 2:** Lint + smoke (in browser preview after Phase 5 wires the dev server).

**Step 3:** Commit.

```bash
git add frontend/src/pages/ArticleEditorPage.jsx frontend/src/App.jsx
git commit -m "lab4: ArticleEditorPage with role-aware CTA + conflict banner"
```

### Task 4.2: ArticleHistoryPage

**Files:**
- Create: `web/frontend/src/pages/ArticleHistoryPage.jsx`
- Modify: `web/frontend/src/App.jsx` — register `/articles/:slug/history` (public).

**Step 1:** Fetch `getArticleHistory(slug)`. For each approved edit, render an expandable card with `DiffView` between this edit's content and the previous approved one (or current article for the latest).

**Step 2:** Commit.

```bash
git commit -am "lab4: ArticleHistoryPage with chronological diff viewer"
```

### Task 4.3: ModerationQueuePage

**Files:**
- Create: `web/frontend/src/pages/ModerationQueuePage.jsx`
- Modify: `web/frontend/src/App.jsx` — register `/moderation` (admin).

**Step 1:** `listEdits({ status: 'pending' })` on mount. Render list. Click → expand panel with `DiffView`. Approve → `approveEdit(id)` → re-fetch. Reject → `RejectModal` → `rejectEdit(id, reason)`. Stale items show `<Badge variant="warning">` "stale".

**Step 2:** Handle 409 ("already reviewed") → friendly toast + auto-refresh.

**Step 3:** Commit.

### Task 4.4: ProfilePage

**Files:**
- Create: `web/frontend/src/pages/ProfilePage.jsx`
- Modify: `web/frontend/src/App.jsx` — register `/profile` (auth).
- Modify: `web/frontend/src/pages/UserDetailPage.jsx` — strip the "My readings" self-view section (now lives in `/profile`).

**Step 1:** Render: account card (username, role, gender), action buttons (Edit user, Log out), "My readings" section (`listReadings`), "My edits" section (`listMyEdits`, grouped by status).

**Step 2:** Commit.

### Task 4.5: TagsAdminPage

**Files:**
- Create: `web/frontend/src/pages/TagsAdminPage.jsx`
- Modify: `web/frontend/src/App.jsx` — register `/tags` (admin).

**Step 1:** Table of tags with inline rename + delete. Add-tag form at the top with auto-slugify-from-name.

**Step 2:** Commit.

### Task 4.6: HomePage update — search + tag filter

**Files:**
- Modify: `web/frontend/src/pages/HomePage.jsx`

**Step 1:** Read `q` and `tag` from `useSearchParams`. Pass to `listArticles({ q, tag })` (extend the API helper to accept params). Mount `<SearchBox>` and `<TagFilter>` above the grid; both write back to the URL.

**Step 2:** Commit.

### Task 4.7: ArticlePage update — CTAs + history link

**Files:**
- Modify: `web/frontend/src/pages/ArticlePage.jsx`

**Step 1:** When authenticated, render "Propose edit" button (regular) or "Edit / Delete" buttons (admin). Add a "View history" link in the meta line. Wire delete via `ConfirmModal`.

**Step 2:** Commit.

### Task 4.8: SiteHeader update — new nav links

**Files:**
- Modify: `web/frontend/src/components/SiteHeader.jsx`

**Step 1:** Add nav links: *Profile* (auth), *Moderation* (admin), *Tags* (admin). Keep existing *Home*, *My reading*, *Users*.

**Step 2:** Commit.

---

## Phase 5 — MSW scaffolding (Lab 5 prep)

### Task 5.1: Install MSW

```bash
cd frontend && npm install --save-dev msw@^2
```

### Task 5.2: Fixtures + handlers + bootstrap

**Files:**
- Create: `web/frontend/src/mocks/fixtures/articles.js` (3 articles)
- Create: `web/frontend/src/mocks/fixtures/users.js` (2 users)
- Create: `web/frontend/src/mocks/fixtures/edits.js` (1 pending, 1 approved, 1 rejected)
- Create: `web/frontend/src/mocks/fixtures/tags.js` (4 tags)
- Create: `web/frontend/src/mocks/handlers.js` — REST handlers for every endpoint Lab 4 calls.
- Create: `web/frontend/src/mocks/server.js` — Node setup for Vitest.
- Create: `web/frontend/src/mocks/browser.js` — `setupWorker(...handlers)` for dev mode.
- Modify: `web/frontend/src/main.jsx` — conditional bootstrap:

```javascript
if (import.meta.env.VITE_USE_MSW === '1') {
    const { worker } = await import('./mocks/browser.js');
    await worker.start();
}
```

**Step 1:** Write fixtures + handlers.

**Step 2:** Verify dev startup works both with and without `VITE_USE_MSW=1`.

```bash
npm run dev                       # no MSW
VITE_USE_MSW=1 npm run dev        # MSW intercepting /api/*
```

**Step 3:** Verify prod build excludes MSW (treeshaken):

```bash
npm run build && grep -c msw dist/assets/index-*.js
```

Expected: `0` (no MSW in prod bundle).

**Step 4:** Commit.

```bash
git add frontend/src/mocks/ frontend/src/main.jsx frontend/package.json frontend/package-lock.json
git commit -m "lab4: MSW scaffolding for Lab 5 (devDep, gated by VITE_USE_MSW)"
```

---

## Phase 6 — Verification & manual smoke

### Task 6.1: Lint + build

```bash
cd frontend && npm run lint && npm run build
```

Expected: 0 lint errors. Build size ≤ 350 KB JS gzip.

### Task 6.2: Backend test sweep

```bash
cd backend && source .venv/bin/activate && pytest -v
```

Expected: ≥ 45 tests, all green.

### Task 6.3: Manual smoke on real Supabase

Walk through design doc Section 7.3 (8-step Variant-5 flow). Capture screenshots for the report.

If issues: open task list, fix, re-test, re-commit.

### Task 6.4: Update lab4-report.md with real numbers + screenshots

**Files:**
- Modify: `web/docs/lab4-report.md` — fill the placeholders for lint/build/test counts and paste screenshots.

```bash
git add docs/lab4-report.md frontend/pages/assets/lab4/* 2>/dev/null
git commit -m "lab4: report updated with smoke screenshots and real metrics"
```

---

## Phase 7 — Merge to development → main

### Task 7.1: Pre-flight

```bash
gh auth status               # confirm kpchknst active
git status                   # working tree clean
git log --oneline development..lab4   # review the commit list
```

### Task 7.2: Push + PR `lab4 → development`

```bash
git push -u origin lab4
gh pr create --base development --title "Lab 4 — Variant-5 functionality" --body "$(cat <<'EOF'
## Summary
- Article CRUD with role-based UX (admin direct-publish vs regular propose-edit FIFO queue)
- Search + tag filter on homepage
- Cover-image input: URL field + drag-and-drop upload via Supabase Storage proxy
- /moderation queue with side-by-side diff, approve / reject (with reason), stale badge
- /profile page (own info + readings + edits)
- /articles/:slug/history (chronological approved edits with diff)
- /tags admin CRUD UI
- MSW scaffolding for Lab 5 (devDep only, gated by VITE_USE_MSW)
- 9 new backend tests (≥ 45 total, all green)
- Bundle ≤ 350 KB JS gzip, lint clean

## Test plan
- [x] Backend `pytest` ≥ 45 tests green
- [x] Frontend `npm run lint` clean, `npm run build` ≤ 350 KB
- [x] Manual smoke (Section 7.3 of design doc): regular proposes → admin reviews diff → approves → stale flag fires
- [x] Cover upload to Supabase Storage and via local-fs fallback (USE_SQLITE=1)
- [x] Tag CRUD admin
- [x] Search + tag filter on homepage

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Merge with **merge commit** (NOT squash) per spec.

### Task 7.3: PR `development → main`

```bash
git checkout development && git pull && git push
gh pr create --base main --title "Promote: Lab 4 → main" --body "Merge Lab 4 (Variant-5 functionality) from development."
```

Merge with merge commit.

### Task 7.4: Update memory

After merge succeeds, update `~/.claude/projects/.../memory/project_webdev_labs.md`:
- Bump `main` SHA in Section 0.
- Flip Lab 4 row in Section 3 per-lab tracker to ✅ ✅ ✅.
- Add `lab4` to "preserved branches" list.
- Append the new PR numbers to the closed-PRs paragraph.

### Task 7.5: Optional — add `lab4` to GitHub Pages deployment branches

```bash
gh api -X POST repos/kpchknst/web/environments/github-pages/deployment-branch-policies -f name=lab4 -f type=branch
```

---

## Quality gates summary

| Gate | Target | Where checked |
|---|---|---|
| Backend tests | ≥ 45, all green | Phase 2.7 + Phase 6.2 |
| Frontend lint | 0 errors / 0 warnings | Phase 6.1 |
| Bundle size | ≤ 350 KB JS gzip | Phase 6.1 |
| Variant-5 stale flag | Manually verified | Phase 6.3 |
| File LOC | ≤ 400 each | Spot-check during code review |
| Function LOC | ≤ 75 each | Spot-check |
| `gh` auth | `kpchknst` active | Every push |
| No secrets in chat / files | Enforced | Continuous |

---

## Definition of done

- [ ] All Phase 1–7 tasks completed.
- [ ] Lab 4 row in memory tracker shows ✅ docs / ✅ code / ✅ on main / ✅ demo verified.
- [ ] User has personally clicked through the Variant-5 demo flow on their machine.
- [ ] PR #30+ (lab4 → dev) and PR #31+ (dev → main) merged with merge commits.
- [ ] `lab4` branch alive on origin (never delete).
