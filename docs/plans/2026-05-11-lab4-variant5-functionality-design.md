# Lab 4 — Variant-5 functionality (maximum spec coverage) — Design

**Date:** 2026-05-11
**Lab:** 4 of 5 (+ Lab 6 bonus) — *Add project-specific functionality to SPA*
**Points:** 25 (per portal screenshot; the older PDF says 15 — trust the screenshot)
**Variant:** 5 — Articles with moderation (2000-char limit, FIFO edit queue, stale-detection on concurrent edits)
**Branch:** `lab4` off `development`
**Supersedes:** Section 7 "Lab 4" paragraph in `2026-05-06-stones-encyclopedia-design.md`; closes Section 11 cover-image open item.

---

## 1. Goal

Take the React SPA shipped in Lab 3 (user CRUD, login/register, AI readings) and extend it with the Variant-5 article-moderation workflow plus all supporting CRUD and admin tooling, so the demo path covers:

> *Regular user proposes an edit → admin reviews diff → admin approves → article version bumps → a second pending edit (with older `base_version`) goes stale.*

Code must continue to satisfy Lab 3 quality gates (≤ 400 LOC per file, ≤ 75 LOC per function, AirBnB lint clean, four-space JS indent). All existing tests must keep passing; new backend tests added.

---

## 2. Scope

### 2.1 In

1. **Article CRUD UI** with role-based behavior (admin direct-publish vs regular propose-edit; design-doc Section 5).
2. **Search box + tag filter** on the homepage (backend already accepts `?q=` and `?tag=`; frontend just wires it).
3. **Cover image input — hybrid:** URL field plus optional drag-and-drop file upload. Files go through a backend `POST /uploads` proxy to a new Supabase Storage bucket `article-covers`. Falls back to local `backend/uploads/` when `USE_SQLITE=1`.
4. **Moderation queue** (`/moderation`, admin only) with side-by-side text diff, approve / reject (with reason modal), stale badge.
5. **Profile page** (`/profile`, auth-required): account info, my readings, my edits — moves the self-view sections out of `/users/:id`.
6. **Article version history** (`/articles/:slug/history`, public): chronological list of all approved edits with a diff viewer.
7. **Tag admin UI** (`/tags`, admin only): create / rename / delete tags.
8. **MSW scaffolding** under `frontend/src/mocks/` (handlers + fixtures, gated by `VITE_USE_MSW=1`) so Lab 5 only writes tests, not infrastructure.

### 2.2 Out (deliberately)

- **Markdown rendering** of article content — current paragraph-split is sufficient and avoids new XSS surface.
- **WebSocket layer** — that's Lab 6.
- **Vitest tests themselves** — that's Lab 5; only the MSW skeleton lands in Lab 4.

---

## 3. Architecture & file layout

### 3.1 Backend (~250 LOC added)

```
backend/app/
├── routers/
│   ├── tags.py           NEW   GET (public), POST/PUT/DELETE (admin)
│   ├── uploads.py        NEW   POST /uploads (admin, multipart)
│   └── articles.py       MOD   add GET /{slug}/history (public)
├── services/
│   └── storage.py        NEW   Supabase Storage wrapper + local fallback
├── schemas.py            MOD   add TagCreate, TagUpdate, UploadOut
└── main.py               MOD   register tags + uploads routers

backend/tests/
├── test_tags.py          NEW
├── test_uploads.py       NEW
└── test_history.py       NEW
```

Env vars added (templated in `.env.example`, never in chat):
- `SUPABASE_URL` (already exists; reused)
- `SUPABASE_SERVICE_KEY` (NEW — service-role for storage write)
- `SUPABASE_STORAGE_BUCKET=article-covers` (NEW; default value)

### 3.2 Frontend (~900 LOC added across ~25 new files)

```
frontend/src/
├── pages/
│   ├── ArticleEditorPage.jsx        NEW (create + edit + propose, role-aware)
│   ├── ArticleHistoryPage.jsx       NEW
│   ├── ModerationQueuePage.jsx      NEW
│   ├── ProfilePage.jsx              NEW
│   ├── TagsAdminPage.jsx            NEW
│   ├── HomePage.jsx                 MOD (search + tag filter)
│   ├── ArticlePage.jsx              MOD (CTAs + history link)
│   └── UserDetailPage.jsx           MOD (drop self-view sections)
├── components/
│   ├── CharCounter.jsx              NEW
│   ├── CoverImageInput.jsx          NEW
│   ├── DiffView.jsx                 NEW
│   ├── EditCard.jsx                 NEW
│   ├── EditConflictBanner.jsx       NEW
│   ├── RejectModal.jsx              NEW
│   ├── SearchBox.jsx                NEW
│   ├── TagFilter.jsx                NEW
│   ├── SiteHeader.jsx               MOD (Moderation, Profile, Tags links)
│   └── (existing components untouched)
├── api/
│   ├── tags.js                      NEW
│   ├── edits.js                     NEW
│   ├── uploads.js                   NEW
│   └── articles.js                  MOD (add create/update/delete/history)
├── utils/
│   ├── diff.js                      NEW (line-by-line LCS, ~60 LOC)
│   └── slugify.js                   NEW
├── mocks/                           NEW (Lab 5 prep, behind VITE_USE_MSW=1)
│   ├── handlers.js
│   ├── server.js
│   ├── browser.js
│   └── fixtures/{articles,users,edits,tags}.js
├── App.jsx                          MOD (6 new routes)
└── main.jsx                         MOD (conditional MSW worker bootstrap)
```

Deps added:
- **prod:** none — uploads go server-side via FastAPI multipart; no `@supabase/supabase-js` in the browser.
- **devDep:** `msw@^2`.

### 3.3 Routes (final shape — 16 total)

| Route | Auth | Page |
|---|---|---|
| `/` | public | HomePage (now with search + tag filter) |
| `/articles/:slug` | public | ArticlePage (CTAs by role) |
| `/articles/:slug/history` | public | ArticleHistoryPage |
| `/articles/new` | admin | ArticleEditorPage (create mode) |
| `/articles/:slug/edit` | auth | ArticleEditorPage (edit / propose mode, role-aware CTA) |
| `/moderation` | admin | ModerationQueuePage |
| `/profile` | auth | ProfilePage |
| `/tags` | admin | TagsAdminPage |
| `/login`, `/register`, `/my-reading` | as today | unchanged |
| `/users`, `/users/new`, `/users/:id`, `/users/:id/edit` | as today | unchanged (UserDetailPage trimmed) |
| `*` | — | NotFoundPage |

---

## 4. Data flow — three critical journeys

### 4.1 Regular user proposes an edit (Variant-5 happy path)

1. From `/articles/rose-quartz`, regular clicks **Propose edit** → routes to `/articles/rose-quartz/edit`.
2. Editor mounts: `GET /articles/rose-quartz` (capture `version` as `base_version`).
3. Concurrently: `GET /edits?status=pending&article_slug=rose-quartz`.
4. If queue non-empty → render yellow `EditConflictBanner` listing pending editors with a *See pending edit* link.
5. User edits title + content (live N/2000 counter + soft warning at 1900); optional cover-image change.
6. Submit → `POST /articles/rose-quartz/edits` with `{ proposed_title, proposed_content, base_version }`.
7. Toast success → redirect `/profile` to show the new pending edit in *My edits*.

### 4.2 Admin moderates

1. `/moderation` → `GET /edits?status=pending` (FIFO order by `submitted_at`).
2. Click an item → routes to `/moderation/{edit_id}` (or modal).
3. Side-by-side `DiffView`: live `article.content` on left, `proposed_content` on right; line-by-line LCS, additions green, deletions red. Title diff above. Stale badge if `base_version < article.version`.
4. **Approve** → `POST /edits/{id}/approve` → backend bumps `article.version` and marks any other pending edits with `base_version < new_version` as `stale` → re-fetch queue → those items now show "⚠ stale (still approvable)".
5. **Reject** → `RejectModal` for reason → `POST /edits/{id}/reject` with reason.

### 4.3 Cover image upload

1. In `ArticleEditorPage`, `CoverImageInput` shows a URL textbox + a drop zone.
2. On drop: validate locally (`type` startsWith `image/`, `size ≤ 2 MB`).
3. `POST /uploads` (multipart) with the file → backend validates again → streams to Supabase Storage `article-covers/<uuid>.<ext>` → returns `{ url }`.
4. URL field auto-fills with the returned public URL → preview thumbnail.
5. Form submit just sends `cover_image_url` like before.

---

## 5. Error handling

- `axios` interceptor unchanged: 401 → clear token + redirect `/login`.
- 403 → `<Alert variant="warning">` "This action requires admin role".
- 409 on slug conflict in create → inline form error.
- 409 on already-reviewed edit → friendly toast "This edit was already reviewed" + auto-refresh queue.
- 422 → inline field errors extracted from FastAPI's `loc`/`msg`.
- Upload 413 / 415 → inline error inside `CoverImageInput`.
- Storage misconfigured (no service key) → backend returns 503 with a helpful message; `CoverImageInput` tells admin to fall back to URL input.

---

## 6. UX details

- **Char counter** at 0–1799 grey, 1800–1999 amber, 2000 red (server still rejects > 2000 via Pydantic).
- **Slugify** auto-generated from title in create mode (admin can override; locked once article exists).
- **Tag picker** (multi-select chips) populated from `GET /tags`.
- **Diff colors** match a-11y contrast ratios: additions `#1a7f37` on `#dafbe1`, deletions `#cf222e` on `#ffebe9`.
- **My edits** in `/profile` grouped by status; click into any pending edit to view its diff side-by-side.
- **Header nav** gains *Moderation* (admin), *Profile* (auth), *Tags* (admin) — *Profile* link visible to every authenticated user (replaces clicking through username avatar).

---

## 7. Testing strategy

### 7.1 Backend (lands in Lab 4)

New pytest cases in `backend/tests/`:
- `test_tags.py` — GET public, POST/PUT/DELETE admin-gated, slug uniqueness 409.
- `test_uploads.py` — admin-only, mime allow-list, 2 MB ceiling, 503 on missing key (mocked storage).
- `test_history.py` — `GET /articles/{slug}/history` returns approved edits in chronological order, exclude pending/rejected.

Existing 36 tests must keep passing. Target: **≥ 45 backend tests, all green**.

### 7.2 Frontend (Lab 4 lands skeleton only; tests in Lab 5)

- `frontend/src/mocks/handlers.js` covers every endpoint Lab 4 calls.
- Fixtures are plain JS objects so Lab 5 can override per-test.
- `vite.config.js` plumbing: `VITE_USE_MSW=1 npm run dev` boots the worker; default unset, no overhead in prod build.

### 7.3 Manual smoke before merging

Against real Supabase (not SQLite):
1. Login `regular/regular123`, propose an edit on Rose Quartz; observe in `/profile` as *pending*.
2. Login `admin/admin123`, see queue, view diff, approve.
3. Verify `articles.version` bumped on Supabase (or via the article reader's "v2" badge).
4. Login `regular`, propose another edit on Rose Quartz; logout, login second `regular` user, propose a third concurrently; admin approves the second-oldest → third one shows stale banner.
5. Admin uploads a 100 KB JPEG as a new cover; confirm it appears on the homepage card.
6. Admin creates a new tag, applies it to an article, filters by it on the homepage.
7. Admin deletes an article via the article-reader CTA; confirm it's gone.
8. Search for "quartz" → only quartz-family stones returned.

---

## 8. Documentation deliverables (Hard Rule 3)

Three files per lab (no collapsing):
- `web/docs/lab4-guide.md` — step-by-step build for Anastasia (every command, expected output).
- `web/docs/lab4-report.md` — what-was-built writeup for the teacher (incl. screenshots of search, queue, diff).
- `web/LAB4.md` — root-level quick-start the teacher reads first on `git checkout lab4`.

Plus design-doc updates:
- `2026-05-06-stones-encyclopedia-design.md` Section 4 — screen list 11 → 16.
- Same doc Section 7 — replace high-level Lab 4 paragraph with a back-pointer to this design.
- Same doc Section 11 — close cover-image open item.

---

## 9. Workflow & branching (per Hard Rules)

- **Branch:** `lab4` off `development` (already created during this session).
- **Pre-flight every session:** `gh auth status` (verify `kpchknst`), `git status`, `gh pr list -R kpchknst/web --state open`.
- **Supabase Storage migration:** one CLI call to create bucket + public-read policy; ask before running.
- **Doc-first cycle (Hard Rule 4):** write the three doc files → STOP → ask for "OK to implement Lab 4" → only then code.
- **Quality gates after coding:**
  - `npm run lint` — 0 errors / 0 warnings.
  - `npm run build` — bundle ≤ 350 KB JS gzip.
  - `pytest` — all green incl. new tests, ≥ 45 total.
  - Manual smoke checklist (Section 7.3) signed off by Anastasia.
- **PR flow:** `lab4 → development` (merge commit, NOT squash), then `development → main` (merge commit). Lab branch never deleted. Add `lab4` to `github-pages` deployment-branch policy if we want a Pages preview.

---

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Supabase Storage free-tier limits / network flakes during demo | Backend falls back to local `backend/uploads/` when `USE_SQLITE=1`; URL input always remains valid |
| Diff library bloat | Hand-rolled ~60-LOC LCS in `utils/diff.js` — no new browser dep |
| MSW v2 ESM/CJS pain in Vite | DevDep only, behind `VITE_USE_MSW=1` env, never in prod build; verify in Lab 4 even though no tests yet |
| Render cold-start hits the demo | Already mitigated — teacher runs locally per spec |
| Lab 5 wants different MSW shape | Fixtures are plain JS objects, easy to retrofit; no test code in Lab 4 to refactor |
| File ≤ 400-LOC ceiling under stress | Split `ArticleEditorPage` if it bloats — extract `ArticleEditorForm` to a subcomponent |
| Two pending edits on same article: stale logic mis-fires | New backend test `test_edits_stale_on_approve` (extension of `test_smoke.py` if a dedicated file feels heavy) |

---

## 11. Approval

User approved Approach 3 (maximum spec coverage) and the design above on 2026-05-11. Implementation plan to be drafted next via the `superpowers:writing-plans` skill.
