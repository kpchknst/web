# LAB 0 — Backend prep (quick start)

> **Branch:** `development` (Lab 0 is the foundation — all later lab branches inherit it)
> **Points:** 0 (mandatory prerequisite)
> **Full guide:** [`docs/lab0-guide.md`](docs/lab0-guide.md) · **Report:** [`docs/lab0-report.md`](docs/lab0-report.md)

## What's in this lab

A REST API in Python + FastAPI, talking to **Supabase Postgres**, with JWT login, user CRUD, article CRUD, edit-proposal workflow, and a stub for the WebSocket added in Lab 6.

## One-time setup

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit backend/.env:
#   DATABASE_URL  →  paste from Supabase → Settings → Database → Session pooler (port 5432)
#   JWT_SECRET    →  python3 -c "import secrets; print(secrets.token_urlsafe(48))"
python -m app.seed
```

## Run

```bash
uvicorn app.main:app --reload --port 8001
```

- API root: http://localhost:8001
- Swagger: http://localhost:8001/docs
- 10 sample stones: http://localhost:8001/articles

## Demo credentials (seed)

- Admin: `admin` / `admin123`
- Regular: `regular` / `regular123`

## Offline fallback

If the demo machine has no internet: set `USE_SQLITE=1` in `backend/.env`, rerun `python -m app.seed`, then `uvicorn` again.
