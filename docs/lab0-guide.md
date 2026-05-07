# Lab 0 — Backend prep — step-by-step guide

> Audience: **you** (Anastasia). This is the build script. Each step is a single command or a single file. Follow top-to-bottom; expected output is shown after each step.
>
> **Points:** 0 (mandatory prerequisite for Labs 2–6).
>
> **Time estimate:** ~60 minutes (most of it is filling in the Supabase password and waiting for `pip install`).

## Pre-flight checklist

Run these once before you start:

```bash
python3 --version          # need 3.11 or newer
pip --version              # any recent pip
gh auth status             # see what GitHub account is active
```

> ⚠️ **Stop** if `gh auth status` shows `a-kupchak` (or any account other than `kpchknst`). Do **not** push or create the repo until you switch:
>
> ```bash
> gh auth login            # then choose github.com, HTTPS, browser, kpchknst account
> # OR (if SSH key is already on kpchknst's GitHub):
> gh auth switch -u kpchknst
> ```

---

## Step 1 — Create the Supabase project (you've already done this)

Project URL: `https://supabase.com/dashboard/project/paxnpiuvpkcnemchvtvy`.

Get the **DATABASE_URL** you'll need in Step 4:

1. Open Dashboard → **Project Settings** → **Database**.
2. Scroll to **Connection string**. Pick the **Session pooler** tab.
3. Choose URI format. Copy the full string. It looks like:
   ```
   postgresql://postgres.paxnpiuvpkcnemchvtvy:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with the password you set when creating the project. (If you forgot it, click "Reset database password" on the same page.)
5. Keep this string in your clipboard — you'll paste it into `backend/.env` in Step 4. **Don't paste it into chat.**

---

## Step 2 — Create the Python virtual environment

```bash
cd /Users/mac/uni/2_kurs/ВТіВД/web/backend
python3 -m venv .venv
source .venv/bin/activate
```

Your prompt should now show `(.venv)` at the start. Verify:

```bash
which python              # should point to …/web/backend/.venv/bin/python
```

---

## Step 3 — Install dependencies

```bash
pip install -r requirements.txt
```

Expected: ~30 packages installed in 30–90 seconds. No red errors.

If `psycopg[binary]` fails to build on macOS, you may need:

```bash
brew install libpq
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
pip install -r requirements.txt
```

---

## Step 4 — Configure secrets

```bash
cp .env.example .env
```

Open `backend/.env` in your editor and:

1. Paste the `DATABASE_URL` from Step 1.
2. Generate a JWT secret:
   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(48))"
   ```
   Copy the output and replace `replace-me-with-a-long-random-string`.

Confirm `backend/.env` is **never** added to git:

```bash
git check-ignore backend/.env
# Expected output: backend/.env
```

---

## Step 5 — Write the application code

> The next files are written by you (or with assistant help) in this order. Each is short — total ~400 LOC.

### 5a. `backend/app/__init__.py` (empty file)

```bash
touch app/__init__.py app/routers/__init__.py
```

### 5b. `backend/app/db.py` — engine and session

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

if os.getenv("USE_SQLITE") == "1":
    DATABASE_URL = "sqlite:///./app.sqlite"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    DATABASE_URL = os.environ["DATABASE_URL"]
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 5c. `backend/app/models.py` — ORM tables

Mirror the schema in [`docs/architecture.md`](architecture.md). Five classes: `User`, `Article`, `ArticleEdit`, `Tag`, `ArticleTag` (association). Each maps 1:1 to the SQL in section 3 of the design doc.

### 5d. `backend/app/schemas.py` — Pydantic request/response models

One pair per resource: `UserCreate`, `UserOut`, `ArticleCreate`, `ArticleOut`, `EditCreate`, `EditOut`, `LoginRequest`, `TokenResponse`. Use `Field(max_length=2000)` on `proposed_content` for the Variant 5 character limit.

### 5e. `backend/app/auth.py` — JWT + password hashing

Helpers: `hash_password`, `verify_password`, `create_access_token`, `decode_token`, and a FastAPI dependency `get_current_user` / `require_admin`.

### 5f. `backend/app/routers/*.py` — five router files

One file per resource (`auth.py`, `users.py`, `articles.py`, `edits.py`, `ws.py`). Each is ≤ 75 lines per endpoint and ≤ 400 lines per file. The `ws.py` file is created in Lab 6 — leave a stub for now.

> Note on `edits.py`: it is included **without a prefix** (see Step 5g) because its routes split across two URL roots — `/articles/{slug}/edits` (proposing) and `/edits/{id}/...` plus `/me/edits` (listing & moderating). Each route declares its full path inside `edits.py`.

### 5g. `backend/app/main.py` — entry point

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from .routers import auth, users, articles, edits

app = FastAPI(title="Stones & Scents API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:8000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     prefix="/auth",     tags=["auth"])
app.include_router(users.router,    prefix="/users",    tags=["users"])
app.include_router(articles.router, prefix="/articles", tags=["articles"])
app.include_router(edits.router,                          tags=["edits"])

@app.get("/")
def health():
    return {"status": "ok"}
```

### 5h. `backend/app/seed.py` — schema + 10 sample stones

```python
from .db import Base, engine, SessionLocal
from .models import User, Article, Tag, ArticleTag
from .auth import hash_password
from datetime import datetime
# … create_all, then insert 1 admin (admin / admin123 — change after demo),
# 1 regular user, 4 tags, and the 10 stones with perfume-pairing notes.
```

Run it:

```bash
python -m app.seed
# Expected: "Created 5 tables. Seeded 10 articles."
```

---

## Step 6 — Run the API

```bash
uvicorn app.main:app --reload --port 8001
```

Expected:

```
INFO:     Uvicorn running on http://127.0.0.1:8001
INFO:     Application startup complete.
```

Open in browser:

- http://localhost:8001/ → `{"status":"ok"}`
- http://localhost:8001/docs → Swagger UI showing all endpoints
- http://localhost:8001/articles → the 10 seeded stones

---

## Step 7 — Smoke-test with curl

```bash
# 1. Login as the seeded admin
curl -s -X POST http://localhost:8001/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"admin","password":"admin123"}' | jq

# 2. Use the token to list users
TOKEN=$(curl -s -X POST http://localhost:8001/auth/login \
        -H 'Content-Type: application/json' \
        -d '{"username":"admin","password":"admin123"}' | jq -r .access_token)
curl -s http://localhost:8001/users -H "Authorization: Bearer $TOKEN" | jq

# 3. List public articles
curl -s http://localhost:8001/articles | jq '.[0]'
```

If all three return JSON without errors, **Lab 0 is done.**

---

## Step 8 — Final checks before moving on

- [ ] `backend/.env` is git-ignored (`git check-ignore backend/.env` prints the path)
- [ ] `requirements.txt` is committed
- [ ] `backend/README.md` is up to date
- [ ] Swagger UI lists all endpoints from [`docs/api.md`](api.md)
- [ ] Seed creates exactly 10 articles
- [ ] No console errors on `uvicorn` startup
- [ ] **`gh auth status` shows `kpchknst`** before any `git push`

When all eight boxes are ticked, write `docs/lab0-report.md` (template already drafted), then move to **Lab 1**.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `psycopg.OperationalError: connection failed` | Wrong port or wrong password in `DATABASE_URL`. The Session pooler is on **5432**; the Direct connection is on **6543**. Use the pooler. |
| `bcrypt` build fails on Apple Silicon | `pip install --upgrade bcrypt` (we use `bcrypt` directly — `passlib` was dropped because its 1.7.4 release is incompatible with bcrypt ≥ 5.0) |
| `CORS` error in browser when frontend calls `/api/*` | Add `http://localhost:8000` to `CORS_ORIGINS` in `.env` |
| Supabase "max connections" | You used the Direct connection; switch to the Session pooler |
| Want to demo offline | Set `USE_SQLITE=1` in `.env`, rerun `python -m app.seed` |
