# Architecture — short version

The full design is in [`plans/2026-05-06-stones-encyclopedia-design.md`](plans/2026-05-06-stones-encyclopedia-design.md). This page is a one-screen summary.

```
┌──────────────────────────┐         HTTPS / JSON          ┌──────────────────────────┐
│   Frontend (React SPA)   │ ───────── REST ───────────►   │   Backend (FastAPI)      │
│   Vite, port 8000        │ ◄─── WebSocket (Lab 6) ───    │   Uvicorn, port 8001     │
│   /api/* → :8001 (proxy) │                               │                          │
└──────────────────────────┘                               └──────────────┬───────────┘
                                                                          │ SQLAlchemy
                                                                          ▼
                                                          ┌──────────────────────────┐
                                                          │  Supabase Postgres       │
                                                          │  (hosted, free tier)     │
                                                          └──────────────────────────┘
```

## Roles

- **anonymous** — read articles only
- **regular** — read + propose article edits + manage own profile
- **admin** — everything regular can do, plus: approve/reject edits, manage users, write articles directly

## Core entities

```
users  ──< article_edits >── articles ──< article_tags >── tags
                              │
                              └── version  (bumped on each approved edit; used for conflict detection)
```

## Edit-conflict mechanism (Variant 5 spec)

1. Editor opens the form → frontend records the article's current `version` as `base_version` in the proposed edit.
2. Multiple `pending` edits per article are allowed; moderator processes them FIFO.
3. When an edit is approved, `articles.version` increments.
4. Other pending edits for the same article whose `base_version` is now stale are flagged in the moderation queue (still approvable — moderator decides).

## Lab 6 WebSocket flow

```
moderator's browser  ── ws://…/ws/moderation ──►  FastAPI  ──◄── article_edits table
   ▲                                                  │
   │  edit_submitted event                            │
   └──────────────────────────────────────────────────┘

regular user's browser  ── ws://…/ws/notifications?user=… ──►  FastAPI
   ▲                                                                │
   │  edit_decision event (approved | rejected)                     │
   └────────────────────────────────────────────────────────────────┘
```

## Branches

`main` → `development` (integration) → `lab1` … `lab6`. Lab branches never deleted.
