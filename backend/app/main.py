"""FastAPI entry point: CORS + router include."""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from .routers import articles, auth, edits, users  # noqa: E402  (import after dotenv)

app = FastAPI(
    title="Stones & Scents API",
    version="0.1.0",
    description="Public encyclopedia of natural stones and minerals "
                "with perfume-pairing notes. Variant 5 — articles with moderation.",
)

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:8000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(articles.router, prefix="/articles", tags=["articles"])
app.include_router(edits.router, tags=["edits"])  # routes split across /articles/.. and /edits/..


@app.get("/", tags=["meta"])
def health():
    return {"status": "ok", "service": "stones-and-scents-api"}
