# Backend — FastAPI + Supabase Postgres

REST API for the Stones & Scents Encyclopedia. Implemented during **Lab 0**, evolves through Labs 4 and 6.

## Prerequisites

- Python 3.11 or newer (`python3 --version`)
- A Supabase project (free tier is fine). The project URL plus the database password are needed for `DATABASE_URL`.

## Setup

```bash
cd backend

# 1. Virtualenv
python3 -m venv .venv
source .venv/bin/activate           # Windows: .venv\Scripts\activate

# 2. Dependencies
pip install -r requirements.txt

# 3. Secrets
cp .env.example .env
# Open backend/.env and paste:
#   - DATABASE_URL  (from Supabase → Settings → Database → Connection string, "Session pooler", port 5432)
#   - JWT_SECRET    (generate with: python -c "import secrets; print(secrets.token_urlsafe(48))")

# 4. Initialize schema + seed 10 stones (one-time)
python -m app.seed

# 5. Run
uvicorn app.main:app --reload --port 8001
```

The API is now at `http://localhost:8001`. Swagger UI: `http://localhost:8001/docs`.

## Offline fallback (optional)

If the teacher's machine has no internet during the demo, set `USE_SQLITE=1` in `backend/.env`. The same SQLAlchemy code switches to a local `app.sqlite` file. Re-run `python -m app.seed` to populate it.

## Endpoints (summary — full reference in `../docs/api.md` or live Swagger at `/docs`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | public | Create a regular user |
| POST | `/auth/login` | public | Returns JWT |
| GET | `/users` | admin | List users |
| GET/PUT/DELETE | `/users/:id` | admin (or self for GET/PUT) | Manage user |
| GET | `/articles` | public | List articles (search, tag filter) |
| GET | `/articles/:slug` | public | Read one article |
| POST/PUT/DELETE | `/articles*` | admin | Manage articles directly |
| POST | `/articles/:slug/edits` | regular+ | Propose an edit |
| GET | `/edits?status=pending` | admin | Moderation queue |
| POST | `/edits/:id/approve` | admin | Approve an edit |
| POST | `/edits/:id/reject` | admin | Reject an edit |
| WS | `/ws/moderation` | admin (Lab 6) | Live queue updates |

## Tests

```bash
pytest
```

## Project layout

```
backend/
├── app/
│   ├── main.py             # FastAPI entry, CORS, router include
│   ├── db.py               # SQLAlchemy engine + session
│   ├── models.py           # ORM models
│   ├── schemas.py          # Pydantic request/response schemas
│   ├── auth.py             # JWT + password hashing
│   ├── seed.py             # 10 sample stones
│   └── routers/
│       ├── auth.py
│       ├── users.py
│       ├── articles.py
│       ├── edits.py
│       └── ws.py
├── tests/
├── requirements.txt
├── .env.example
└── README.md
```
