# Lab 4 build guide — Variant-5 functionality (article CRUD, moderation, profile)

> Audience: **you (Anastasia)**, building Lab 4 from scratch on a fresh
> machine. Every command is meant to be copy-pasted in order. Lab 0
> (FastAPI backend), Lab 1 (compiled SCSS, stone images), Lab 2 (AJAX) and
> Lab 3 (React SPA + user CRUD) **must already be in place**.

The lab is graded out of **25 points** (per the portal screenshot — the
older PDF says 15; trust the screenshot). The deliverable is the
Variant-5 functionality layered on top of the Lab 3 React SPA: article
CRUD, FIFO edit-moderation queue with side-by-side diff, stale-detection
on concurrent edits, search + tag filter, profile page, version history,
admin tag management, and a hybrid cover-image input (URL field +
drag-and-drop upload via a backend Supabase Storage proxy).

The full design lives in
[`docs/plans/2026-05-11-lab4-variant5-functionality-design.md`](plans/2026-05-11-lab4-variant5-functionality-design.md)
and the bite-sized implementation plan in
[`docs/plans/2026-05-11-lab4-variant5-functionality-plan.md`](plans/2026-05-11-lab4-variant5-functionality-plan.md). This guide
walks through executing that plan.

---

## 0. Prerequisites

You should have:

- The repo at `~/uni/2_kurs/ВТіВД/web/` with `main` already containing
  Labs 0–3 (PRs #1–#29 merged).
- Node 20+, npm 10+, Python 3.11+, the backend's `.venv` already set up
  with `pip install -r requirements.txt` run.
- `backend/.env` filled in with a working `DATABASE_URL` (Supabase
  Session pooler) and `JWT_SECRET`. **Never paste secrets in chat or
  commit `.env`.**
- Active GitHub auth as `kpchknst`:

```bash
gh auth status                                  # Active account: kpchknst
```

Optional but recommended for the live cover-upload demo:

- A Supabase **service-role key** (added to `backend/.env` as
  `SUPABASE_SERVICE_KEY=…`). If absent, the backend automatically falls
  back to writing uploads to local `backend/uploads/` and serves them at
  `/uploads/*`.

---

## 1. Branch off `development`

```bash
cd ~/uni/2_kurs/ВТіВД/web
git checkout development
git pull --ff-only origin development
git checkout -b lab4
```

Spec rule: every lab gets its own `lab{N}` branch, never deleted, with
≥ 1 descriptive commit. PRs merge with **merge-commits** (no squash).

---

## 2. Create the Supabase Storage bucket (one-time)

For the live cover-upload path. Skip this section if you only want the
local-fs fallback.

In the Supabase dashboard for project `paxnpiuvpkcnemchvtvy`:

1. Storage → **New bucket** → name `article-covers`, set **Public**.
2. Policies → Add policy → "Allow public read" on the bucket.
3. Settings → API → copy the **service-role key**. **Paste it into
   `backend/.env` as `SUPABASE_SERVICE_KEY=…`. Do NOT paste it in chat.**
4. (Optional) `SUPABASE_STORAGE_BUCKET=article-covers` if you used a
   different bucket name.

---

## 3. Phase 2 — backend (TDD)

Each backend feature follows: write failing tests → implement → run
tests → commit. Open the implementation plan in a second window and
follow Tasks 2.1–2.7 in order.

```bash
cd backend
source .venv/bin/activate
pytest -q                            # baseline: 36 tests green
```

### 3.1 Tags router

```bash
# 1. Write tests
$EDITOR tests/test_tags.py           # paste from plan §2.1

# 2. Run them — expect 6 failures
pytest tests/test_tags.py -v

# 3. Implement
$EDITOR app/routers/tags.py          # plan §2.2
$EDITOR app/schemas.py               # add TagCreate, TagUpdate
$EDITOR app/main.py                  # register router

# 4. Re-run — expect 6 PASS
pytest tests/test_tags.py -v

# 5. Commit
git add backend/app/routers/tags.py backend/app/schemas.py backend/app/main.py backend/tests/test_tags.py
git commit -m "lab4: backend tags CRUD with admin gating"
```

### 3.2 Article history endpoint

Same TDD flow with `tests/test_history.py` and the `GET
/articles/{slug}/history` addition to `routers/articles.py` (plan §2.3
+ §2.4).

### 3.3 Storage service + uploads router

The most novel part of the backend. Plan §2.5 + §2.6.

Important: `services/storage.py` checks two env vars in order:

1. `USE_SQLITE=1` → always use local-fs fallback.
2. `SUPABASE_SERVICE_KEY` empty → also use local-fs fallback.
3. Otherwise → upload to Supabase Storage.

This means Anastasia's machine and the offline teacher demo both work
without touching the code.

```bash
# After implementation
pytest tests/test_uploads.py -v       # 5 PASS
git add backend/app/services/storage.py backend/app/routers/uploads.py \
        backend/app/schemas.py backend/app/main.py backend/.env.example \
        backend/tests/test_uploads.py
git commit -m "lab4: backend POST /uploads with Supabase Storage + local-fs fallback"
```

### 3.4 Backend full sweep

```bash
pytest -v
# expect ≥ 45 tests, all green
```

Smoke against your local backend:

```bash
uvicorn app.main:app --reload --port 8002
# Open http://localhost:8002/docs
# Verify endpoints exist: GET /tags, POST /uploads, GET /articles/{slug}/history
```

---

## 4. Phase 3 — frontend foundation

### 4.1 API modules

```bash
cd ../frontend
$EDITOR src/api/tags.js              # plan §3.1
$EDITOR src/api/edits.js
$EDITOR src/api/uploads.js
$EDITOR src/api/articles.js          # add create/update/delete/history
npm run lint                         # silent
git add src/api/
git commit -m "lab4: frontend api modules for tags, edits, uploads, articles CRUD"
```

### 4.2 Utils

```bash
$EDITOR src/utils/diff.js            # plan §3.2 — line-by-line LCS
$EDITOR src/utils/slugify.js
npm run lint
git add src/utils/
git commit -m "lab4: frontend utils — diff (LCS) and slugify"
```

### 4.3 Reusable components — eight files, one commit each

For each of `CharCounter`, `SearchBox`, `TagFilter`, `EditCard`,
`DiffView`, `EditConflictBanner`, `RejectModal`, `CoverImageInput`:

```bash
$EDITOR src/components/<Name>.jsx
npm run lint
git add src/components/<Name>.jsx
git commit -m "lab4: <Name> component"
```

### 4.4 SCSS

Append rules to `src/styles/spa.css` for the new components and pages.
Keep the file under 400 LOC; if it gets close, split into per-feature
files. Reuse the existing colour and spacing tokens.

---

## 5. Phase 4 — frontend pages

Eight commits, one per page or page-update. Plan §4.1–§4.8.

For each page, the workflow is:

```bash
$EDITOR src/pages/<Page>.jsx          # write the component
$EDITOR src/App.jsx                   # register the route
npm run lint
npm run dev                           # open in browser, click around
git add src/pages/<Page>.jsx src/App.jsx
git commit -m "lab4: <Page> with <one-line summary>"
```

The most complex page is `ArticleEditorPage.jsx`. If it goes over
350 LOC, extract `ArticleEditorForm.jsx` as a subcomponent (the 400-LOC
file cap is hard).

---

## 6. Phase 5 — MSW scaffolding (Lab 5 prep)

```bash
cd frontend
npm install --save-dev msw@^2

mkdir -p src/mocks/fixtures
$EDITOR src/mocks/fixtures/articles.js
$EDITOR src/mocks/fixtures/users.js
$EDITOR src/mocks/fixtures/edits.js
$EDITOR src/mocks/fixtures/tags.js
$EDITOR src/mocks/handlers.js
$EDITOR src/mocks/server.js
$EDITOR src/mocks/browser.js
$EDITOR src/main.jsx                  # add the conditional bootstrap

# Verify both modes
npm run dev                           # no MSW, normal proxy to :8001
VITE_USE_MSW=1 npm run dev            # MSW intercepts /api/*

# Verify treeshake
npm run build && grep -c msw dist/assets/index-*.js
# expect: 0

git add src/mocks/ src/main.jsx package.json package-lock.json
git commit -m "lab4: MSW scaffolding for Lab 5 (devDep, gated by VITE_USE_MSW)"
```

---

## 7. Phase 6 — verification

```bash
cd frontend
npm run lint                          # 0 errors / 0 warnings
npm run build                         # ≤ 350 KB JS gzip
cd ../backend
source .venv/bin/activate
pytest -v                             # ≥ 45 tests green
```

### 7.1 Manual smoke (the spec's grading bar)

Run the backend and the SPA:

```bash
# Terminal A — backend on :8002 (Docker holds 8001 on Anastasia's Mac)
cd backend && source .venv/bin/activate
CORS_ORIGINS="http://localhost:5173,http://localhost:8000" \
    uvicorn app.main:app --reload --port 8002

# Terminal B
cd frontend && npm run dev
```

Walk through the 8-step Variant-5 flow from the design doc, capturing
screenshots:

1. Login `regular`/`regular123` → `/articles/rose-quartz` → click
   **Propose edit** → see the article in the editor → change a sentence
   → submit. Verify it appears in `/profile` as *pending*.
2. Logout → login `admin`/`admin123` → click **Moderation** in the nav.
   Verify the queue shows the pending edit at the top.
3. Click into the edit → side-by-side diff renders → click **Approve**.
4. Verify `/articles/rose-quartz` now shows **v2** (or higher) and the
   updated title/content.
5. Login as a second `regular` user. Propose another edit. Logout. Login
   as the first `regular`. Propose a third edit. Now login `admin` and
   approve the second edit; observe that the third edit shows the
   **stale** badge.
6. As admin, on `/articles/new`, drag a 100 KB JPEG into the cover-image
   drop zone → preview shows → submit the new article. Verify the
   homepage card uses the uploaded image.
7. As admin, `/tags` → create a new tag → apply it to an article →
   homepage tag-filter chip → verify only matching articles show.
8. Top-of-homepage **search box** → type "quartz" → grid filters live.

### 7.2 Update the report with real numbers

Open `docs/lab4-report.md` and fill in:

- Lint output (should be silent, exit 0).
- `npm run build` size in KB and gzip.
- `pytest` test count.
- Paste the smoke screenshots.

```bash
git add docs/lab4-report.md frontend/pages/assets/lab4/* 2>/dev/null
git commit -m "lab4: report updated with smoke screenshots and real metrics"
```

---

## 8. Phase 7 — PR + merge

```bash
gh auth status                        # confirm kpchknst active
git push -u origin lab4
gh pr create --base development --title "Lab 4 — Variant-5 functionality" \
    --body-file docs/plans/2026-05-11-lab4-variant5-functionality-plan.md
# Review the PR in browser, then merge via "Create a merge commit"
# (NOT squash) per spec.

git checkout development && git pull
gh pr create --base main --title "Promote: Lab 4 → main" \
    --body "Merge Lab 4 (Variant-5 functionality) from development."
# Merge commit again.
```

After merging, the `lab4` branch stays alive on origin (never delete).

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `pytest` fails on `test_uploads.py` with `Connection refused` | The Supabase storage path is being exercised but the service key is empty | Either set `SUPABASE_SERVICE_KEY` in `.env` (real key) or set `USE_SQLITE=1` to force the local-fs fallback in tests |
| Cover upload returns 503 in browser | `SUPABASE_SERVICE_KEY` missing in backend env | Either add the key to `backend/.env` and restart `uvicorn`, or set `USE_SQLITE=1` so uploads land in `backend/uploads/` |
| MSW worker fails to start in dev | `VITE_USE_MSW=1` set but `public/mockServiceWorker.js` missing | Run `npx msw init public/ --save` once |
| Stale flag never fires | Approving an edit that has the same `base_version` as the freshest article | By design — only edits with `base_version < new_version` get marked stale; reproduce with two different `base_version` values |
| `npm run lint` complains about `<Outlet/>` from MSW | MSW v2 uses `http` instead of `rest`; old syntax in handlers | Rewrite `rest.get(...)` → `http.get(...)` per MSW v2 docs |

---

## 10. What this lab does NOT cover

- **Vitest tests themselves** — Lab 5 (5 pts).
- **WebSocket toasts** for live moderation queue updates — Lab 6 (bonus).
- **Markdown rendering** of article content — kept out of scope; current
  paragraph-split renderer is sufficient.
