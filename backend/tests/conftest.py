"""Pytest fixtures.

Strategy: every test session uses one **in-memory SQLite database**, seeded
once with the same data the production seed produces. This keeps the test
suite hermetic — it never touches the real Supabase Postgres — while
exercising the same SQLAlchemy models, Pydantic schemas, and FastAPI routes.

The two env vars below are set BEFORE any `app.*` import so that:
- `app.db` chooses the SQLite branch (`USE_SQLITE=1`).
- `app.auth` finds a non-empty `JWT_SECRET` and doesn't raise at import time.

We then monkey-patch the in-memory engine into both `app.db` and `app.seed`
because both modules captured the originals at import time via
`from .db import engine, SessionLocal`.
"""

import os

os.environ["USE_SQLITE"] = "1"
os.environ["JWT_SECRET"] = "x" * 64  # length only matters for entropy, not for tests

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture(scope="session")
def _seeded_app():
    """Build an in-memory DB, seed it, and return the FastAPI app."""
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    test_session = sessionmaker(bind=test_engine, autoflush=False, autocommit=False)

    from app import db as db_mod
    db_mod.engine = test_engine
    db_mod.SessionLocal = test_session

    from app import seed as seed_mod
    seed_mod.engine = test_engine
    seed_mod.SessionLocal = test_session

    from app.db import Base
    Base.metadata.create_all(bind=test_engine)
    seed_mod.seed()

    from app.main import app
    yield app


@pytest.fixture(scope="session")
def client(_seeded_app):
    from fastapi.testclient import TestClient
    return TestClient(_seeded_app)


@pytest.fixture(scope="session")
def admin_token(client):
    response = client.post(
        "/auth/login", json={"username": "admin", "password": "admin123"}
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture(scope="session")
def regular_token(client):
    response = client.post(
        "/auth/login", json={"username": "regular", "password": "regular123"}
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def regular_headers(regular_token):
    return {"Authorization": f"Bearer {regular_token}"}
