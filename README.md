# Stones & Scents Encyclopedia

A public encyclopedia of natural stones and minerals, with perfume-pairing notes for each stone. Anyone can read; registered users can propose edits; admins approve or reject them.

This is the lab project for **Web Development and Web Design** (Spring 2020 spec, Variant 5 — Articles with moderation).

## Stack

- **Backend:** Python 3.11+, FastAPI, SQLAlchemy, Supabase Postgres, JWT auth
- **Frontend:** HTML + SCSS (Lab 1) → vanilla JS + AJAX (Lab 2) → React + Vite (Lab 3+)
- **Tests:** Vitest + React Testing Library + MSW
- **Real-time (Lab 6):** native WebSocket via FastAPI

## Repository layout

```
web/
├── backend/      # FastAPI app — see backend/README.md
├── frontend/     # Static then SPA — see frontend/README.md
├── docs/         # Per-lab guides, reports, architecture
├── LAB0.md … LAB6.md   # Quick-start per lab branch
└── README.md     # this file
```

## Branches

| Branch | Contents |
|---|---|
| `main` | this README only, points to `development` |
| `development` | integration; everything merges here via PR |
| `lab1` … `lab6` | per-lab work — never deleted |

## Quick start

See **[`LAB0.md`](LAB0.md)** for the backend setup, then the lab branch you want to demo:

```bash
git checkout lab3                         # for example
# follow LAB3.md
```

## Documentation

- **[Design doc](docs/plans/2026-05-06-stones-encyclopedia-design.md)** — full architecture, data model, screens, edit-conflict UX
- **[Architecture overview](docs/architecture.md)** — short version
- **[API reference](docs/api.md)** — endpoint list (live Swagger at `localhost:8001/docs`)
- **Per-lab guides:** `docs/lab{0..6}-guide.md` (how to build) and `docs/lab{0..6}-report.md` (what was built)
