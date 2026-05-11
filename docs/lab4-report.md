# Lab 4 report — Variant-5 functionality

**Variant 5 · Anastasia Kupchak · Group [TBD]**

> Goal of Lab 4 (25 pts per portal screenshot — older PDF says 15;
> trust the screenshot): extend the Lab 3 React SPA with all
> Variant-5-specific functionality. Per the spec: *"In scope of this
> lab students continue practice with single page application. SPA
> shall be extended with variant specific functionality using static
> layouts from lab #1. As a result all features shall be implemented.
> Code shall meet requirements from lab #3."*

Variant 5 is "Articles with moderation": a 2000-character limit on
article content, a FIFO queue for proposed edits, and explicit
handling of concurrent edits via base-version tracking and a stale
flag.

---

## 1. Spec compliance — line by line

| Spec requirement | Implementation | File reference |
|---|---|---|
| All variant-specific features implemented | Article CRUD, search + tag filter, propose-edit form, moderation queue with diff, profile page with own-edits history, version history page, tag admin, hybrid cover-image input | see §3 |
| 2000-character article limit (Variant 5) | Pydantic `Field(max_length=2000)` on `ArticleCreate.content` and `EditCreate.proposed_content`; client-side `<CharCounter/>` shows live N/2000 and warns at 1900 | `backend/app/schemas.py:71`, `frontend/src/components/CharCounter.jsx` |
| Concurrent-edit handling (Variant 5) | Each `article_edits` row records `base_version`; on approve, the article's `version` increments and other pending edits with `base_version < new_version` are marked `stale`; the editor UI shows an `EditConflictBanner` warning when other pending edits exist for the same article | `backend/app/routers/edits.py:104-139`, `frontend/src/components/EditConflictBanner.jsx`, `frontend/src/pages/ModerationQueuePage.jsx` |
| Side-by-side diff for moderator | Hand-rolled line-by-line LCS in `utils/diff.js` (~60 LOC, no external dep); `<DiffView/>` renders two columns with additions green and deletions red | `frontend/src/utils/diff.js`, `frontend/src/components/DiffView.jsx` |
| Search box | `<SearchBox/>` with 300 ms debounce on the homepage; writes `?q=` to the URL; backend `GET /articles?q=` does a case-insensitive `ILIKE` on title + content | `frontend/src/components/SearchBox.jsx`, `frontend/src/pages/HomePage.jsx`, `backend/app/routers/articles.py:17-31` |
| Tag filter | `<TagFilter/>` chips populated from `GET /tags`; multi-select stored in `?tag=`; backend joins on `article_tags` | `frontend/src/components/TagFilter.jsx`, `backend/app/routers/tags.py`, `backend/app/routers/articles.py:29-30` |
| Cover image (URL or upload) | Hybrid — URL textbox + drag-and-drop drop zone; on drop, file is POSTed multipart to `/uploads`, backend validates mime + size and uploads to Supabase Storage `article-covers` (or local-fs fallback when offline) | `frontend/src/components/CoverImageInput.jsx`, `backend/app/routers/uploads.py`, `backend/app/services/storage.py` |
| Profile page | `/profile` (auth-required): account info + "My readings" + "My edits" grouped by status | `frontend/src/pages/ProfilePage.jsx` |
| Version history | `/articles/:slug/history` lists all approved edits chronologically with `<DiffView/>` per entry | `frontend/src/pages/ArticleHistoryPage.jsx`, `backend/app/routers/articles.py` (`GET /{slug}/history`) |
| Lab 3 quality bars carried forward | Files ≤ 400 LOC, functions ≤ 75 LOC, AirBnB-base lint silent, 4-space JS indent, two-browser smoke (Chrome + Firefox) | this report, §6 |

---

## 2. Stack additions on top of Lab 3

| Layer | New | Why |
|---|---|---|
| Backend storage | `supabase>=2.0` Python client + a thin wrapper in `services/storage.py` | Variant-5 needs cover images; Supabase Storage is hosted, free-tier-friendly, and shares creds with the existing Supabase Postgres |
| Backend offline fallback | `LOCAL_DIR = backend/uploads/`, served via `StaticFiles(...)` | Teacher demo machine may have no internet; `USE_SQLITE=1` flips uploads to local-fs without changing call sites |
| Frontend MSW | `msw@^2` (devDep only) | Lab 5 prep; treeshaken out of the prod bundle, gated on `VITE_USE_MSW=1` |
| New router | `routers/tags.py`, `routers/uploads.py` | Variant-5 tag CRUD + upload proxy |
| New schemas | `TagCreate`, `TagUpdate`, `UploadOut` | Pydantic validation for the new endpoints |

No new prod dependency on the React side — uploads go server-side via
FastAPI multipart, so the browser never imports `@supabase/supabase-js`.

---

## 3. Screens delivered

| Route | Auth | Page | Notes |
|---|---|---|---|
| `/` | public | `HomePage` (updated) | Now shows search box + tag filter chips |
| `/articles/:slug` | public | `ArticlePage` (updated) | Adds CTAs by role: regular sees "Propose edit"; admin sees "Edit / Delete" |
| `/articles/:slug/history` | public | `ArticleHistoryPage` | New |
| `/articles/new` | admin | `ArticleEditorPage` | Create mode |
| `/articles/:slug/edit` | auth | `ArticleEditorPage` | Edit / propose mode, role-aware CTA |
| `/moderation` | admin | `ModerationQueuePage` | New — FIFO queue, side-by-side diff, approve / reject (with reason), stale badges |
| `/profile` | auth | `ProfilePage` | New — own info + readings + edits |
| `/tags` | admin | `TagsAdminPage` | New — tag CRUD |

`/users/:id` no longer shows self-only sections (those moved to
`/profile`); admin user listing remains unchanged.

---

## 4. Edit-conflict mechanism (Variant-5 mandatory)

```
Time  Actor       Action                             articles.version  edit.status / base_version
────  ──────────  ─────────────────────────────────  ────────────────  ──────────────────────────
T0    seed        Article rose-quartz at v1                       v1   —
T1    Maria       opens /articles/rose-quartz/edit                v1   captures base_version=1
T2    Sasha       opens /articles/rose-quartz/edit                v1   captures base_version=1
T3    Maria       submits proposal A                              v1   A.status=pending base=1
T4    Sasha       submits proposal B  (sees yellow banner)        v1   B.status=pending base=1
T5    admin       /moderation, sees diff for A, approves          v2   A.status=approved
T6    backend     marks B.status=stale  (B.base_version < 2)      v2   B.status=stale  base=1
T7    admin       /moderation still shows B with "stale" badge    v2   B is still approvable
```

Implemented in:
- `backend/app/routers/edits.py:104-139` — `approve_edit` bumps version
  and flips other pending rows to `stale`.
- `frontend/src/pages/ArticleEditorPage.jsx` — fetches
  `GET /edits?status=pending&article_slug=…` on mount and renders the
  yellow banner if any.
- `frontend/src/pages/ModerationQueuePage.jsx` — adds a yellow "stale"
  badge and a tooltip that explains the moderator may still approve.

---

## 5. Demo flow (the 8-step run)

(Screenshots to be inserted after smoke run — see `frontend/pages/assets/lab4/`.)

1. **Login `regular`** → `/articles/rose-quartz` → click *Propose edit* → modify a paragraph → submit → redirect to `/profile` → see *pending* edit.
2. **Logout, login `admin`** → top-nav *Moderation* → queue lists the proposal at the top.
3. **Click the proposal** → side-by-side diff (live left, proposed right) with green additions and red deletions → click *Approve*.
4. **`/articles/rose-quartz`** → meta line shows **v2** (or higher); content reflects Maria's change.
5. **Race**: as a second `regular`, propose another edit; logout, login as the first `regular`, propose a third; admin approves the second; the third now shows the **stale** badge in the queue.
6. **Cover upload**: as admin, on `/articles/new`, drag `frontend/src/assets/test-100kb.jpg` into the drop zone → preview appears → fill title/slug/content → submit → homepage card shows the uploaded image.
7. **Tag admin**: `/tags` → *Add tag* → name "Bonus", slug "bonus" → save. Open an article in edit mode, attach the tag, save. On the homepage, click the *bonus* chip in `<TagFilter/>` → grid filters to that single article.
8. **Search**: clear filters, type "quartz" in the search box → after the 300 ms debounce, only quartz-family articles remain.

---

## 6. Quality metrics

> Filled in after Phase 6 verification.

| Metric | Target | Actual |
|---|---|---|
| Frontend lint (`npm run lint`) | 0 errors / 0 warnings, exit 0 | _TBD_ |
| Frontend bundle (`npm run build`) | ≤ 350 KB JS gzip | _TBD_ |
| Backend tests (`pytest`) | ≥ 45, all green | _TBD_ |
| Largest source file | ≤ 400 LOC | _TBD_ |
| Largest function | ≤ 75 LOC | _TBD_ |
| Two browsers | Chrome + Firefox, no console errors | _TBD_ |
| Page load on cold cache | < 4 s | _TBD_ |

---

## 7. Files added / changed

> Filled in after implementation.

```
backend/app/routers/tags.py         NEW
backend/app/routers/uploads.py      NEW
backend/app/services/storage.py     NEW
backend/app/routers/articles.py     MOD (+history endpoint)
backend/app/schemas.py              MOD (+TagCreate, TagUpdate, UploadOut)
backend/app/main.py                 MOD (+routers, +static mount)
backend/.env.example                MOD (+SUPABASE_SERVICE_KEY)
backend/tests/test_tags.py          NEW
backend/tests/test_history.py       NEW
backend/tests/test_uploads.py       NEW

frontend/src/pages/ArticleEditorPage.jsx     NEW
frontend/src/pages/ArticleHistoryPage.jsx    NEW
frontend/src/pages/ModerationQueuePage.jsx   NEW
frontend/src/pages/ProfilePage.jsx           NEW
frontend/src/pages/TagsAdminPage.jsx         NEW
frontend/src/pages/HomePage.jsx              MOD
frontend/src/pages/ArticlePage.jsx           MOD
frontend/src/pages/UserDetailPage.jsx        MOD (drop self-view)
frontend/src/components/CharCounter.jsx      NEW
frontend/src/components/CoverImageInput.jsx  NEW
frontend/src/components/DiffView.jsx         NEW
frontend/src/components/EditCard.jsx         NEW
frontend/src/components/EditConflictBanner.jsx NEW
frontend/src/components/RejectModal.jsx      NEW
frontend/src/components/SearchBox.jsx        NEW
frontend/src/components/TagFilter.jsx        NEW
frontend/src/components/SiteHeader.jsx       MOD (+Moderation, Profile, Tags)
frontend/src/api/tags.js                     NEW
frontend/src/api/edits.js                    NEW
frontend/src/api/uploads.js                  NEW
frontend/src/api/articles.js                 MOD (+CRUD, +history)
frontend/src/utils/diff.js                   NEW
frontend/src/utils/slugify.js                NEW
frontend/src/mocks/                          NEW (Lab 5 prep)
frontend/src/App.jsx                         MOD (+6 routes)
frontend/src/main.jsx                        MOD (+conditional MSW bootstrap)
frontend/src/styles/spa.css                  MOD
```

---

## 8. Out of scope (deliberately deferred)

- **Vitest tests** for the new components — Lab 5.
- **WebSocket toasts** for live moderation queue updates — Lab 6.
- **Markdown rendering** of article content — kept out; current
  paragraph-split renderer is sufficient.
- **Tag colour palette / icon set** — stylistic only, not graded.
