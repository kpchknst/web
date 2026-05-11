# LAB 4 — Variant-5 functionality (quick start)

> **Branch:** `lab4` · **Points:** 25
> **Full guide:** [`docs/lab4-guide.md`](docs/lab4-guide.md) · **Report:** [`docs/lab4-report.md`](docs/lab4-report.md)
> **Design:** [`docs/plans/2026-05-11-lab4-variant5-functionality-design.md`](docs/plans/2026-05-11-lab4-variant5-functionality-design.md) · **Plan:** [`docs/plans/2026-05-11-lab4-variant5-functionality-plan.md`](docs/plans/2026-05-11-lab4-variant5-functionality-plan.md)

## What's in this lab

The Lab 3 React SPA gains all Variant-5 functionality: article CRUD, a
FIFO edit-moderation queue with side-by-side diff and stale-detection,
search + tag filter on the homepage, a profile page (own info +
readings + edits), version history per article, admin tag management,
and a hybrid cover-image input (URL field + drag-and-drop upload via a
backend Supabase Storage proxy).

| Variant-5 requirement | How it's covered |
|---|---|
| 2000-character article limit | Pydantic `Field(max_length=2000)` server-side; live `<CharCounter/>` client-side |
| FIFO edit queue | `articles.version` + `article_edits.base_version`; queue ordered by `submitted_at`; approve bumps version and marks older-base pending edits **stale** |
| Side-by-side diff | Hand-rolled line-by-line LCS in `utils/diff.js`; `<DiffView/>` renders two columns, additions green, deletions red |
| Cover image upload | `POST /uploads` admin-only multipart; backend uploads to Supabase Storage `article-covers` (or local-fs fallback when offline) |
| Search + tag filter | URL-driven `?q=` and `?tag=`; backend `GET /articles?q=&tag=` with `ILIKE` + tag join |
| Profile page | `/profile` shows account info + AI readings + own edits grouped by status |
| Version history | `/articles/:slug/history` lists approved edits chronologically with diffs |
| Tag admin | `/tags` admin CRUD page |

## One-time setup

```bash
# 1. Lab 0 backend (.venv + .env with DATABASE_URL + JWT_SECRET — see LAB0.md)
# 2. Lab 1 SCSS compiled to pages/styles/main.css
# 3. Lab 3 frontend deps
cd frontend && npm install

# (Optional, for live cover upload) Add SUPABASE_SERVICE_KEY to backend/.env
# from the Supabase dashboard → Settings → API. Without it, uploads fall back
# to local backend/uploads/ which the backend serves at /uploads/*.
```

## Run the app

```bash
# Terminal A — backend on :8002 (Docker holds 8001 on Anastasia's Mac)
cd backend && source .venv/bin/activate
CORS_ORIGINS="http://localhost:5173,http://localhost:8000" \
    uvicorn app.main:app --reload --port 8002

# Terminal B — Vite dev server
cd frontend && npm run dev
# → http://localhost:5173 (or :8000 with --port 8000)
```

## Demo credentials (seeded by `python -m app.seed`)

- Admin: `admin` / `admin123`
- Regular: `regular` / `regular123`

## How to demo (60-second walkthrough)

1. **Open `/`** → search "quartz" → grid filters live; click a tag chip → grid filters again.
2. **Login `regular`** → click into Rose Quartz → click **Propose edit** → tweak a sentence → submit. `/profile` now shows the proposal as *pending*.
3. **Logout, login `admin`** → top-nav **Moderation** → click the proposal → side-by-side diff → **Approve**. Article jumps to v2.
4. **Open `/articles/rose-quartz/history`** → the approved edit is listed with its diff.
5. **`/tags`** → add a tag, attach it to an article in `/articles/<slug>/edit`, see it appear as a filter chip on `/`.
6. **`/articles/new`** → drag a small JPG into the cover-image drop zone → preview → submit → new article shows the uploaded cover on the homepage.

## Quality gates

```bash
cd frontend && npm run lint        # exit 0, silent
npm run build                      # ≤ 350 KB JS gzip
cd ../backend && source .venv/bin/activate && pytest -v   # ≥ 45 tests green
```

## What this lab does NOT cover

- **Vitest tests** for the new components — Lab 5 (5 pts).
- **WebSocket toasts** for live moderation updates — Lab 6 (bonus).
- **Markdown rendering** of article content — paragraph-split is sufficient.
