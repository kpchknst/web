# Stones & Scents Encyclopedia — Design Document

**Date:** 2026-05-06
**Course:** Web Development and Web Design (Spring 2020 spec)
**Variant:** 5 — Articles with moderation
**Repo:** https://github.com/kpchknst/web (to be created — see Lab 0)
**Topic:** Public encyclopedia of natural stones / minerals with perfume-pairing notes

---

## 1. Goals & scope

Deliver a single coherent project across **5 graded labs + 1 optional bonus lab** that satisfies every requirement in `Lab_0.pdf` … `Lab_3.pdf` plus the Lab 4–6 updates from the course portal screenshots.

**Final demo target:** the teacher checks out the repo on their own machine, runs **two commands** (one for backend, one for frontend), opens `localhost:8000` in two browsers, and can perform the full user journey plus the moderation workflow.

**Total points target:** 60 graded + bonus from Lab 6.

| Lab | Title | Points |
|---|---|---|
| 0 | Backend prep | 0 (mandatory) |
| 1 | Static layout, SCSS, GitHub Pages, AI assets | 10 (3 + 5 + 2) |
| 2 | AJAX with pure JS + ESLint | 10 |
| 3 | React SPA with user CRUD | 10 |
| 4 | Variant-specific functionality | 25 |
| 5 | Unit tests, coverage > 70 % | 5 |
| 6 | WebSocket (live moderation queue) | bonus |

---

## 2. Architecture

**Monorepo at `https://github.com/kpchknst/web`:**

```
web/
├── backend/                        # Python + FastAPI + Supabase Postgres
│   ├── app/
│   │   ├── main.py                 # FastAPI entry, CORS, router include
│   │   ├── db.py                   # SQLAlchemy engine + session
│   │   ├── models.py               # ORM models
│   │   ├── schemas.py              # Pydantic request/response schemas
│   │   ├── auth.py                 # JWT + password hashing
│   │   ├── seed.py                 # 10 sample stones
│   │   └── routers/
│   │       ├── auth.py             # POST /auth/login, POST /auth/register
│   │       ├── users.py            # CRUD users (admin-gated)
│   │       ├── articles.py         # public list/read, admin write
│   │       ├── edits.py            # propose/list/approve/reject edits
│   │       └── ws.py               # /ws/moderation (Lab 6)
│   ├── tests/
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
├── frontend/                       # Lab 1: HTML+SCSS, then Vite+React from Lab 3
│   ├── (Lab 1) pages/, styles/, assets/
│   ├── (Lab 3+) src/, vite.config.js, vitest.config.js
│   ├── package.json
│   └── README.md
├── docs/
│   ├── plans/
│   │   └── 2026-05-06-stones-encyclopedia-design.md   # this file
│   ├── architecture.md             # high-level overview
│   ├── api.md                      # endpoint reference
│   ├── lab{0..6}-guide.md          # step-by-step for the user
│   └── lab{0..6}-report.md         # what was done, for the teacher
├── LAB{0..6}.md                    # quick-start per lab (in repo root)
├── README.md
├── .gitignore
└── .env.example                    # symlink/copy to backend/.env.example
```

**Tech stack:**

| Layer | Choice | Why |
|---|---|---|
| Backend language | Python 3.11+ | Spec allows Python; user requested it |
| Backend framework | FastAPI + Uvicorn | Async, auto-Swagger at `/docs`, Pydantic validation |
| ORM | SQLAlchemy 2.x | Standard, works with any Postgres |
| Database | **Supabase Postgres** (hosted) | User requested; real Postgres without local install |
| Auth | JWT via `python-jose` + `passlib[bcrypt]` | Lightweight, no extra service |
| Frontend Lab 1 | HTML5 + SCSS | Spec mandates SCSS, no JS in Lab 1 |
| Frontend Lab 2 | + vanilla JS (`fetch`) + ESLint Airbnb | Spec mandates pure JS, no jQuery, ESLint |
| Frontend Lab 3+ | Vite + React 18 + React Router v6 | Smallest learning curve, fastest dev server |
| HTTP client | `fetch` (Lab 2) → `axios` (Lab 3+) | Consistent with React patterns |
| Tests | Vitest + React Testing Library + MSW | Vite-native, Jest-API-compatible |
| Lab 6 transport | Native `WebSocket` (browser) + FastAPI `@app.websocket` | Hand-rolled, matches "WebSocket" in spec |

**Local commands the teacher runs:**

```bash
# back end
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                          # then paste DATABASE_URL
python -m app.seed                             # one-time seed of 10 stones
uvicorn app.main:app --reload --port 8001     # API on :8001

# front end (Lab 3+)
cd frontend
npm install
npm run dev                                    # SPA on :8000, proxies /api/* → :8001
```

CORS is enabled for `http://localhost:8000` only.

---

## 3. Data model

**Two roles** (matching Lab 1 "Admin and Regular"):
- **regular** — read everything, propose article edits, manage own profile
- **admin** — everything + approve/reject edits + manage users + create/delete articles directly

Anonymous visitors can read articles but are redirected to `/login` on any protected action.

**Tables (Postgres):**

```sql
-- users
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
username      text UNIQUE NOT NULL
password_hash text NOT NULL
role          text NOT NULL CHECK (role IN ('regular','admin'))
created_at    timestamptz NOT NULL DEFAULT now()

-- articles
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
slug            text UNIQUE NOT NULL
title           text NOT NULL
content         text NOT NULL CHECK (char_length(content) <= 2000)
cover_image_url text
author_id       uuid REFERENCES users(id) ON DELETE SET NULL
version         int  NOT NULL DEFAULT 1     -- bumped on each approved edit
created_at      timestamptz NOT NULL DEFAULT now()
updated_at      timestamptz NOT NULL DEFAULT now()

-- article_edits
id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
article_id        uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE
editor_id         uuid NOT NULL REFERENCES users(id)
proposed_title    text NOT NULL
proposed_content  text NOT NULL CHECK (char_length(proposed_content) <= 2000)
base_version      int  NOT NULL              -- articles.version when editor opened the form
status            text NOT NULL CHECK (status IN ('pending','approved','rejected','stale'))
                  DEFAULT 'pending'
submitted_at      timestamptz NOT NULL DEFAULT now()
reviewed_at       timestamptz
reviewer_id       uuid REFERENCES users(id)
rejection_reason  text

-- tags
id   uuid PRIMARY KEY DEFAULT gen_random_uuid()
name text NOT NULL
slug text UNIQUE NOT NULL

-- article_tags (many-to-many)
article_id uuid REFERENCES articles(id) ON DELETE CASCADE
tag_id     uuid REFERENCES tags(id)     ON DELETE CASCADE
PRIMARY KEY (article_id, tag_id)
```

**Seed:** 10 stones — Rose Quartz, Aventurine, Amethyst, Citrine, Black Tourmaline, Lapis Lazuli, Moonstone, Tiger's Eye, Selenite, Carnelian. Each article includes a "Perfume pairing" paragraph (e.g. *Rose Quartz pairs with Tom Ford Rose Prick or Jo Malone Velvet Rose & Oud*). Tags include `quartz-family`, `with-perfume-notes`, `chakra-heart`, `protective`.

---

## 4. Screens (11 total)

**User-management screens (Lab 1 mandate):**
1. `/login` — login page
2. `/users` — user listing, badge per role (admin only sees full list; regular sees self only)
3. `/users/new` — create user (modal)
4. `/users/:id` — user detail
5. `/users/:id/edit` — edit user
6. (Delete-user confirm → modal on the listing)

**Variant-5 screens:**
7. `/` — article listing (homepage, public, with search + tag filter)
8. `/articles/:slug` — article reader (public) with "Propose edit" button when authenticated
9. `/articles/:slug/edit` & `/articles/new` — article editor with live 2000-char counter
10. `/moderation` — moderation queue (admin only) with side-by-side diff
11. `/profile` — own profile + own edits (pending / approved / rejected)

**Cross-cutting components:** top nav (logo, search, login/logout, role badge), toast stack, inline form validation.

Total: **6 user-management** + **5 variant-specific** ≥ "≥ 3 variant screens" requirement.

---

## 5. Edit-conflict UX (Variant 5 mandatory requirement)

**Mechanism — optimistic concurrency with explicit FIFO queue:**

1. `articles.version` is bumped each time an edit is approved.
2. Every `article_edits` row records `base_version` — the article version the editor saw when they opened the form.
3. Multiple `pending` edits per article are allowed and processed in submission order by the moderator.

**User B opens `/articles/rose-quartz/edit` while User A's edit is pending:**
- Editor loads the **current published version**.
- Yellow banner: *"⚠️ 1 pending edit by **maria** is ahead of yours in the moderation queue. If maria's edit is approved before yours, the moderator will see your version may need rebasing."*
- "**See pending edit**" link previews maria's proposal.
- User B can submit anyway. Their `article_edits` row records `base_version = current published version`.

**Moderator at `/moderation`:**
- Queue sorted by `submitted_at` (oldest first).
- Each item shows: editor, submission time, **side-by-side diff** of `proposed_content` vs **the live article**.
- On approving an edit: the live article is updated, `version` increments. Any other pending edits for the same article whose `base_version < new_version` are flagged `stale` (still approvable, but visually warned).

**Lab 6 layer:** when User B submits, the moderator sees the new queue entry appear without refresh; when the moderator approves/rejects, User B sees a toast notification.

---

## 6. Branching strategy

```
main         (lightweight: README only; points to development as the active branch)
└── development   (integration; everything merges back here via PR)
    ├── lab1     (Lab 1 work)
    ├── lab2     (Lab 2 work)
    ├── lab3     (Lab 3 work)
    ├── lab4     (Lab 4 work)
    ├── lab5     (Lab 5 work)
    └── lab6     (Lab 6 work — bonus)
```

Per the spec: each lab branch must have ≥ 1 well-named commit (e.g. `lab2: fetch articles list from API`). PRs merge into `development`. Lab branches are **never deleted** (final state has 7 branches alive).

The backend (Lab 0) is created on `development` directly so that `lab1` (which doesn't need the backend) can branch off cleanly. From `lab2` onward, branches inherit the latest backend.

---

## 7. Per-lab plan (high level)

### Lab 0 — backend prep (0 pts, mandatory prerequisite)
FastAPI app, SQLAlchemy models, Supabase Postgres connection via `DATABASE_URL`, JWT auth, seed 10 stones, Swagger UI at `/docs`. Output: working API on `localhost:8001`.

### Lab 1 — static layout (10 pts: 3 + 5 + 2)
All 11 screens as static HTML+SCSS — no JS yet. Mock data inline. SCSS uses variables for colors/typography, ≥ 1 mixin, nesting capped at 2 levels. Deployed to **GitHub Pages** at `kpchknst.github.io/web` from the `lab1` branch's `/frontend/pages` folder.

**AI deliverables (worth 7 of the 10 points):**
- ≥ 5 AI-generated stone illustrations (DALL-E / Midjourney / Bing Image Creator) — 2 pts
- A **ChatGPT-experience writeup** in `docs/lab1-report.md`: prompts used, outputs, what we kept vs. discarded, time saved, lessons learned — 5 pts

### Lab 2 — AJAX + linter (10 pts)
`npm init`, ESLint with Airbnb config, vanilla `fetch` calls. ≥ 3 endpoints exercised: `GET /articles`, `POST /auth/login`, `GET /users`. Article list and login are wired to real API responses. `npm run lint` passes with zero warnings. No console errors. Two browsers tested (Chrome + Firefox).

### Lab 3 — React SPA with user CRUD (10 pts)
Vite + React rewrite of the `frontend/`. React Router with refresh-safe routes. JWT stored in `localStorage` and put on `Authorization: Bearer …` header by an `axios` interceptor. Auth context exposes `user` and `role`. **Full user CRUD** (list, create, view, edit, delete). README has one-command setup. `localhost:8000` per spec. Files ≤ 400 LOC, functions ≤ 75 LOC.

### Lab 4 — variant-specific functionality (25 pts)
Article CRUD, tag filter, search box, **moderation queue**, **edit-conflict UX** (Section 5 above), profile page with own edits, character counter, image upload (or URL input) for cover image.

### Lab 5 — unit tests (5 pts)
Vitest + React Testing Library + MSW. Tests for `LoginForm`, `ArticleList`, `ArticleEditor`, `ModerationQueue`, `UserList` plus hooks (`useAuth`, `useArticles`, `useEdits`) and utils (validators, char-count). `npm run coverage` reports **> 70 %**. Coverage HTML report linked from `docs/lab5-report.md`.

### Lab 6 — WebSocket (bonus)
Backend: `@app.websocket("/ws/moderation")` broadcasts `{type: "edit_submitted", edit: {…}}` to admins on submit, `{type: "edit_decision", edit_id, decision}` to authors on approve/reject. Frontend: `useWebSocket` hook on `/moderation` and `/profile` pages auto-reconnects with backoff.

---

## 8. Testing strategy

**Coverage target:** > 70 % statements (Lab 5 acceptance bar).

**What we test:**
- **Pure utils** (cheap, high coverage): `validators.ts` (username/password rules, 2000-char check, slug generator), `formatters.ts` (date, role badge text), `diff.ts` (string diff for moderation view).
- **Hooks** with `@testing-library/react-hooks`: `useAuth` (login/logout, JWT refresh, role-gating), `useArticles` (list, fetch by slug), `useEdits` (submit, list pending).
- **Components** with RTL: `LoginForm` (validation errors, submit calls), `ArticleEditor` (counter behavior at 1999/2000/2001 chars), `ModerationQueue` (renders items, approve calls API), `UserList` (admin sees all, regular sees self).
- **API mocking** with **MSW** so tests run with no backend running.

**Scripts in `frontend/package.json`:**
```json
"test":     "vitest",
"coverage": "vitest run --coverage"
```

**Backend tests** (nice-to-have, not required by Lab 5): `pytest` + `httpx.AsyncClient` smoke tests in `backend/tests/` (≥ 3 endpoints).

---

## 9. Documentation deliverables

For each lab `N` ∈ `{0, 1, 2, 3, 4, 5, 6}`:

| File | Audience | Contents |
|---|---|---|
| `docs/lab{N}-guide.md` | the user (Anastasia) | Step-by-step build instructions, every command, expected output |
| `docs/lab{N}-report.md` | the teacher | Spec requirements, what was implemented, how to demo, screenshots; Lab 1's contains the **ChatGPT-experience writeup** (graded), Lab 5's contains the **coverage screenshot** |
| `LAB{N}.md` (repo root) | the teacher (first thing they see on `git checkout lab3`) | One-screen quick-start: what's in this branch, setup commands, how to demo |

Plus repo-level docs:
- `README.md` — top-level project description, link to design doc, branch map
- `docs/architecture.md` — concise version of this design doc
- `docs/api.md` — endpoint reference (cross-reference to FastAPI Swagger)

---

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Teacher demo machine has no internet → can't reach Supabase | Document a fallback to local SQLite in `backend/README.md`; one env-var switch (`USE_SQLITE=1`) makes the same SQLAlchemy code use SQLite |
| Wrong GitHub account commits to `kpchknst/web` | `gh auth status` check before any push; do not initialize git until user confirms account is switched |
| 2000-char limit accidentally bypassed via API | Pydantic `Field(max_length=2000)` on `proposed_content` + DB CHECK constraint (defence in depth) |
| Edit-conflict UX too complex to demo | Section 5's design is FIFO with optional stale flag — moderator can ignore the warning if they want, no blocking |
| Lab points-system mismatch (PDF vs portal screenshots) | Trust the screenshots (newer): Lab 4 = 25 pts, Lab 5 = 5 pts. Note this in `docs/lab4-report.md` and `lab5-report.md` |
| Plagiarism check (per spec footer) | All commits authored by `kpchknst`; AI-generated assets credited in `lab1-report.md` per spec requirement |

---

## 11. Open items (decided later, not blocking)

- Cover image upload mechanism: URL input (simple) vs file upload to Supabase Storage (richer). Decision in Lab 4.
- Tag color palette / icon set (purely visual, decided in Lab 1 mockups).
- Whether to deploy the Lab 3+ React SPA (Vercel / Netlify) in addition to the local-only spec requirement. Bonus polish, not required.

---

## 12. Approval

User approved sections 1–6 verbatim plus the Supabase substitution and Lab 6 Option A on 2026-05-06. This document supersedes any earlier verbal scope.
