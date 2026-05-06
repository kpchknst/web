# Lab 0 — Backend prep — report

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
| Auth | JWT (`python-jose`) + bcrypt password hashing (`passlib`) | Self-contained, no extra service |
| Process manager | Uvicorn | The official ASGI server for FastAPI |

A **SQLite fallback** is built in (`USE_SQLITE=1` in `.env`) so the API runs entirely offline if the teacher's machine has no internet.

## What was built

| Layer | File | Lines | Notes |
|---|---|---|---|
| Entry | `app/main.py` | ~25 | CORS + router include |
| DB | `app/db.py` | ~25 | Engine, session, `Base` |
| Models | `app/models.py` | ~85 | 5 tables (users, articles, article_edits, tags, article_tags) |
| Schemas | `app/schemas.py` | ~110 | Request/response Pydantic models with validation |
| Auth | `app/auth.py` | ~70 | `hash_password`, `verify_password`, `create_access_token`, `get_current_user`, `require_admin` |
| Routers | `app/routers/{auth,users,articles,edits}.py` | ~70 each | Five resource files, ≤ 75 lines per endpoint |
| Seed | `app/seed.py` | ~80 | Creates schema and inserts 10 stones + 1 admin + 1 regular user + 4 tags |

Total: **~600 LOC**, all under the 400-LOC-per-file and 75-LOC-per-function limits the spec sets for the front end (applied here voluntarily for consistency).

The `app/routers/ws.py` file is a stub for now and is implemented in Lab 6.

## Endpoints

15 REST endpoints + 1 WebSocket. See **[`docs/api.md`](api.md)** or the live Swagger at `http://localhost:8001/docs`.

## Data seed

10 stones, each with a 2000-character article and a "Perfume pairing" paragraph: Rose Quartz, Aventurine, Amethyst, Citrine, Black Tourmaline, Lapis Lazuli, Moonstone, Tiger's Eye, Selenite, Carnelian. Tags: `quartz-family`, `with-perfume-notes`, `chakra-heart`, `protective`. Default users: `admin` / `admin123` and `regular` / `regular123` (demo only — change after).

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

- [x] All endpoints documented in Swagger UI (FastAPI auto-generates this from the Pydantic schemas).
- [x] No errors on startup; `uvicorn` log clean.
- [x] Smoke-tested with curl: `POST /auth/login`, `GET /users` (with JWT), `GET /articles` — all 200.
- [x] `backend/.env` is in `.gitignore` (verified with `git check-ignore`).
- [x] Plain-Postgres fallback to SQLite tested locally.

## What's next

Lab 1 will use this backend's static seed via plain HTML mockups, and Lab 2 will hit it with `fetch`. From Lab 3 onward the React SPA replaces all manual calls.
