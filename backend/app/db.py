"""SQLAlchemy engine, session factory, and FastAPI dependency.

Driver selection:
- Default uses Postgres (Supabase Session pooler) via psycopg v3.
- USE_SQLITE=1 swaps to a local SQLite file (offline demo fallback).
"""

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

if os.getenv("USE_SQLITE") == "1":
    DATABASE_URL = "sqlite:///./app.sqlite"
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        future=True,
    )
else:
    raw_url = os.environ.get("DATABASE_URL")
    if not raw_url:
        raise RuntimeError(
            "DATABASE_URL is not set. Either fill it in backend/.env "
            "(Supabase Session pooler URL) or set USE_SQLITE=1 for the offline fallback."
        )
    # SQLAlchemy 2 + psycopg v3 wants the explicit driver suffix.
    if raw_url.startswith("postgresql://") and "+psycopg" not in raw_url:
        raw_url = raw_url.replace("postgresql://", "postgresql+psycopg://", 1)
    engine = create_engine(raw_url, pool_pre_ping=True, future=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
