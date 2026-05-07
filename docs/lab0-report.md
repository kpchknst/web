# Lab 0 — Backend prep — report

> **STATUS:** This report is regenerated whenever the backend code changes. The line counts, endpoint counts, and quality-check results below reflect the current state of `backend/app/` on this branch — re-run `wc -l backend/app/**/*.py` after any change to refresh the numbers.
>
> Audience: **the teacher**. This file documents what was built, why, and how to demo it.
>
> **Branch:** `development` (Lab 0 is the foundation; later lab branches inherit it)
> **Points:** 0 (mandatory prerequisite, not graded)

---

## What the spec asks for

From [`Lab_0.pdf`](../../Lab_0.pdf):

> *During labs each student should implement a front end project. It's a single page application that works with back end that was implemented in the previous course. In case of BE project absence, another one shall be created using Python, PHP or NodeJS. During lab evaluation both FE and BE projects will be checked out to a teacher's computer, so all requirements shall be easily installable.*

I had no back-end from a previous course, so I built one from scratch using Python.

## Tech choices

| Concern | Choice | Reason |
|---|---|---|
| Language | Python 3.11+ | Allowed by spec; widely available |
| Framework | FastAPI | Auto Swagger UI, Pydantic validation, async |
| ORM | SQLAlchemy 2.x | Standard, works with both Postgres and SQLite |
| Database | **Supabase Postgres** (hosted) | Real Postgres without local install on the teacher's machine |
| Auth | JWT (`python-jose`) + bcrypt password hashing (direct `bcrypt`) | Self-contained, no extra service |
| Process manager | Uvicorn | The official ASGI server for FastAPI |

> **Note on `bcrypt`:** the design originally specified `passlib[bcrypt]`, but the unmaintained passlib 1.7.4 (last release 2020) is incompatible with bcrypt ≥ 5.0 — its internal version-detection breaks at import time. We dropped `passlib` and call the `bcrypt` library directly from `app/auth.py` (two functions: `hash_password`, `verify_password`). Behaviour is unchanged: same bcrypt cost factor 12 hashes, just no middleware.

A **SQLite fallback** is built in (`USE_SQLITE=1` in `.env`) so the API runs entirely offline if the teacher's machine has no internet.

## What was built

| Layer | File | Lines | Notes |
|---|---|---|---|
| Entry | `app/main.py` | 37 | CORS + router include + `/` health check |
| DB | `app/db.py` | 44 | Engine, session, `Base`, automatic Postgres ↔ SQLite switch |
| Models | `app/models.py` | 111 | 5 tables: `users`, `articles`, `article_edits`, `tags`, `article_tags` |
| Schemas | `app/schemas.py` | 118 | Pydantic v2 models; `Field(max_length=2000)` on article content |
| Auth | `app/auth.py` | 87 | `hash_password`, `verify_password`, `create_access_token`, `decode_token`, `get_current_user`, `require_admin` |
| Routers | `app/routers/auth.py` | 46 | register, login, me |
| Routers | `app/routers/users.py` | 98 | full user CRUD (list, get, create, update, delete) |
| Routers | `app/routers/articles.py` | 99 | article CRUD + search/tag filter |
| Routers | `app/routers/edits.py` | 160 | propose/list/get/approve/reject + my-edits + Variant 5 stale-flagging |
| Routers | `app/routers/ws.py` | 6 | placeholder for Lab 6 WebSocket |
| Seed | `app/seed.py` | 291 | Schema, 10 stones with full text, 4 tags, 2 demo users |

**Total: 1,097 LOC** across 11 source files. Every file is under the 400-LOC-per-file and 75-LOC-per-function limits the spec sets for the front end (applied here voluntarily for consistency). The seed file is the largest because each of the 10 articles is 920–1100 characters of original prose.

## Endpoints

**19 REST endpoints + 1 WebSocket stub.** See **[`docs/api.md`](api.md)** or the live Swagger at `http://localhost:8001/docs` (or 8002 if 8001 is taken on the demo machine).

| Group | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Users | `GET /users`, `POST /users`, `GET/PUT/DELETE /users/{id}` |
| Articles | `GET /articles`, `POST /articles`, `GET/PUT/DELETE /articles/{slug}` |
| Edits | `POST /articles/{slug}/edits`, `GET /edits`, `GET /me/edits`, `GET /edits/{id}`, `POST /edits/{id}/approve`, `POST /edits/{id}/reject` |
| WebSocket | `/ws/moderation` (stub, implemented in Lab 6) |

Tag CRUD endpoints (listed in `docs/api.md`) are deferred to Lab 4 — the seed already creates the 4 needed tags, and `GET /articles?tag=<slug>` already filters by tag.

## Data seed

10 stones, each with an original prose article (920–1100 characters, well under the 2000-character Variant 5 limit) ending in a "Perfume pairing" paragraph: Rose Quartz, Aventurine, Amethyst, Citrine, Black Tourmaline, Lapis Lazuli, Moonstone, Tiger's Eye, Selenite, Carnelian. Tags: `quartz-family`, `with-perfume-notes`, `chakra-heart`, `protective`. Default users: `admin` / `admin123` and `regular` / `regular123` (demo only — change after).

The seed is **idempotent**: re-running `python -m app.seed` skips users, tags, and articles that already exist, so it is safe to re-run after schema changes.

## How to demo

1. **Setup** (one-time, from the repo root):
   ```bash
   cd backend
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   # Paste DATABASE_URL into .env (Supabase Session pooler, port 5432)
   # Paste a generated JWT_SECRET into .env
   python -m app.seed
   ```

2. **Run:**
   ```bash
   uvicorn app.main:app --reload --port 8001
   ```

3. **Show:**
   - Open `http://localhost:8001/docs` → live Swagger UI.
   - From Swagger, expand `POST /auth/login`, click "Try it out", body `{"username":"admin","password":"admin123"}`. Copy the returned `access_token`.
   - Click "Authorize" (top right), paste `Bearer <token>`. Now `GET /users` works.
   - Open `http://localhost:8001/articles` → the 10 seeded stones returned as JSON.

4. **Offline mode** (if no internet):
   - Set `USE_SQLITE=1` in `backend/.env`.
   - `python -m app.seed` again (creates `backend/app.sqlite`).
   - `uvicorn app.main:app --reload --port 8001` — API now uses local SQLite.

## Quality checks

- [x] All 19 endpoints documented in Swagger UI (FastAPI auto-generates this from the Pydantic schemas).
- [x] All Python files compile cleanly (`python -m py_compile`).
- [x] No errors on startup; `uvicorn` log shows `Application startup complete` in ~1 s.
- [x] **Full smoke-test run** (SQLite mode) — all 10 checks pass:
  1. `GET /` → `{"status":"ok","service":"stones-and-scents-api"}`
  2. `GET /articles` → 10 stones returned, each with content + tags
  3. `POST /auth/login` (`admin/admin123`) → JWT issued
  4. `GET /auth/me` with token → admin profile returned
  5. `GET /users` (admin) → 2 users (admin, regular)
  6. `GET /articles/rose-quartz` → 1024-char article with 3 tags
  7. `POST /articles/rose-quartz/edits` (regular user) → edit accepted, status `pending`
  8. `GET /edits?status=pending` (admin) → moderation queue lists the edit
  9. `POST /edits/{id}/approve` (admin) → edit status `approved`, `reviewed_at` populated
  10. `GET /articles/rose-quartz` again → article version `v2`, title and content updated (Variant 5 mandatory flow verified end-to-end)
- [x] `backend/.env` is in `.gitignore` (verified with `git check-ignore backend/.env`).
- [x] SQLite fallback (`USE_SQLITE=1`) verified with the same 10-step run.

## What's next

Lab 1 will use this backend's static seed via plain HTML mockups, and Lab 2 will hit it with `fetch`. From Lab 3 onward the React SPA replaces all manual calls.
