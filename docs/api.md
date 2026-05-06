# API reference

The authoritative interactive reference is the auto-generated Swagger UI at:

> **http://localhost:8001/docs**

(start the backend with `uvicorn app.main:app --reload --port 8001` to view it)

This file is a static cheat sheet. Update it whenever you add an endpoint.

## Auth

| Method | Path | Role | Body | Response |
|---|---|---|---|---|
| POST | `/auth/register` | public | `{ username, password }` | `{ id, username, role }` |
| POST | `/auth/login` | public | `{ username, password }` | `{ access_token, token_type: "bearer" }` |
| GET | `/auth/me` | any | — | `{ id, username, role }` |

JWT goes in the `Authorization: Bearer <token>` header.

## Users

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/users` | admin | Paginated list, `?q=<search>` |
| GET | `/users/:id` | admin or self | — |
| POST | `/users` | admin | `{ username, password, role }` |
| PUT | `/users/:id` | admin or self | Partial update |
| DELETE | `/users/:id` | admin | — |

## Articles

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/articles` | public | `?q=<search>&tag=<slug>&limit&offset` |
| GET | `/articles/:slug` | public | Includes `version` |
| POST | `/articles` | admin | `{ title, slug, content, cover_image_url, tag_ids[] }` |
| PUT | `/articles/:slug` | admin | Direct edit (no moderation) — increments `version` |
| DELETE | `/articles/:slug` | admin | Cascade-deletes pending edits |

## Article edits (proposed by regular users)

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/articles/:slug/edits` | regular+ | `{ proposed_title, proposed_content, base_version }` — `base_version` from the article the editor saw |
| GET | `/edits` | admin | `?status=pending&article_slug=…` — moderation queue |
| GET | `/edits/:id` | admin or editor | Detail with diff view payload |
| GET | `/me/edits` | any | The authenticated user's own edits |
| POST | `/edits/:id/approve` | admin | Updates the article, increments `version`, marks any other pending edits whose `base_version` < new `version` as `stale` |
| POST | `/edits/:id/reject` | admin | `{ reason }` |

## Tags

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/tags` | public | — |
| POST | `/tags` | admin | `{ name }` (slug auto-generated) |
| DELETE | `/tags/:slug` | admin | — |

## WebSocket (Lab 6)

| Path | Auth | Direction | Messages |
|---|---|---|---|
| `/ws/moderation` | admin (JWT in `?token=`) | server → client | `{ type: "edit_submitted", edit: {…} }` |
| `/ws/notifications?user_id=…` | self | server → client | `{ type: "edit_decision", edit_id, decision: "approved"\|"rejected", reason? }` |

## Error format

```json
{ "detail": "Human-readable message", "code": "machine_readable_code" }
```

HTTP status codes are used per RFC: `200`/`201` success, `400` validation, `401` unauthorized, `403` forbidden, `404` not found, `409` conflict (e.g. stale `base_version`), `500` server error.
