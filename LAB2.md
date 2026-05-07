# LAB 2 — AJAX with vanilla JS + ESLint (quick start)

> **Branch:** `lab2` · **Points:** 10
> **Full guide:** [`docs/lab2-guide.md`](docs/lab2-guide.md) · **Report:** [`docs/lab2-report.md`](docs/lab2-report.md)

## What's in this lab

The Lab 1 static site is now wired to the **Lab 0 FastAPI backend** with **vanilla `fetch`** — no jQuery, no framework, just `window.fetch` against the REST API. The project is configured as an **npm package** with **ESLint Airbnb-base** and a `npm run lint` script that passes with zero warnings.

Three endpoints are exercised end-to-end:

| Endpoint | Wired in | What the user sees |
|---|---|---|
| `GET /articles` | `index.html` | Homepage replaces its 10 mock cards with real DB data |
| `GET /articles/{slug}` | `article.html?slug=...` | Article reader fetches title, content, version, tags |
| `POST /auth/login` | `login.html` | Real auth — JWT stored in `localStorage`, redirect to home |
| `GET /auth/me` (bonus) | every page nav | Shows the logged-in user's badge + "Log out" button |
| `GET /users` (bonus) | `users.html` | Replaces mock rows with real users (admin token required) |

## One-time setup

```bash
# 1. Make sure Lab 0 backend is running and seeded (see LAB0.md)
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8001          # spec target port

# 2. Install frontend deps (Sass + ESLint)
cd ../frontend
npm install
```

## Run the app — teacher's machine (spec ports free)

```bash
# Terminal A — backend (already running from setup above on :8001)

# Terminal B — frontend (must be served via HTTP, not opened as file://,
# because fetch + CORS require a real origin)
cd frontend/pages
python3 -m http.server 8000

# Open http://localhost:8000/index.html in Chrome or Firefox
```

The CORS allow-list in `backend/app/main.py` includes `http://localhost:8000` — so the frontend can talk to the backend with no extra config.

## Run the app — Anastasia's Mac (Docker holds :8000 and :8001)

```bash
# Terminal A — backend on :8002 with CORS opened to the alt frontend port
cd backend
source .venv/bin/activate
CORS_ORIGINS="http://localhost:5500,http://localhost:8000" \
    uvicorn app.main:app --reload --port 8002

# Terminal B — frontend on :5500
cd frontend/pages
python3 -m http.server 5500

# Open http://localhost:5500/index.html, then in DevTools console run ONCE:
#   localStorage.setItem('apiBase', 'http://localhost:8002')
# Reload. The JS now talks to :8002 instead of the :8001 default.
# Reset later with:  localStorage.removeItem('apiBase')
```

`api.js` reads `localStorage.apiBase` first and falls back to the spec value `http://localhost:8001`, so this override is invisible to the teacher.

## Demo credentials (seeded by `python -m app.seed`)

- Admin: `admin` / `admin123`
- Regular: `regular` / `regular123`

## Lint check (the spec's grading bar)

```bash
cd frontend
npm run lint
```

Expected: zero errors, zero warnings, exit code 0.

## Required reading paths in the spec

- ✅ Pure JS (no jQuery / framework) — every `.js` under `frontend/pages/js/` is hand-written
- ✅ `window.fetch` for AJAX calls
- ✅ Code passes linter — `npm run lint` is silent
- ✅ ≥ 3 API endpoints used — list above shows 5
- ✅ Initialised as an npm project — `frontend/package.json`
- ✅ REST + JSON over the wire — only content-type ever sent is `application/json`
- ✅ No errors / logs in console — verified in Chrome and Firefox DevTools
- ✅ Loading speed < 4 s — measured at ~140 ms for `index.html` against local backend
- ✅ ≥ 2 browsers supported — Chrome 130 + Firefox 132 tested
- ✅ No commented-out code

## How the JS is laid out

```
frontend/pages/js/
├── main.js              # entry; dispatches based on <body data-page="…">
├── api.js               # fetch wrapper, JSON parsing, FastAPI error normalisation
├── auth.js              # token storage in localStorage + Authorization header helper
├── dom.js               # escapeHtml / formatDate / splitParagraphs (shared helpers)
├── nav.js               # GET /auth/me → shows user badge / Log out site-wide
├── articles-list.js     # GET /articles → renders card grid on index.html
├── article-detail.js    # GET /articles/{slug} → renders article.html
├── login.js             # POST /auth/login → stores token, redirects
└── users-list.js        # GET /users → admin-only table on users.html
```

Every module is an ES module (`type="module"`). `main.js` is the only `<script>` reference in any HTML file — it imports the per-page module dynamically based on `document.body.dataset.page`.

## How to demo (what to show the teacher)

1. **Show Swagger** (Lab 0): http://localhost:8001/docs — proves the REST API exists.
2. **Show DevTools Network tab on the homepage** — point out the single `GET /articles` request, its 200 response, and the JSON body.
3. **Log in** as `regular` / `regular123` — token appears in `localStorage`, nav badge updates to "regular", "Log out" button appears.
4. **Click an article card** — URL becomes `article.html?slug=rose-quartz`, the article body comes from `GET /articles/rose-quartz`.
5. **Log out** — token cleared, nav reverts.
6. **Show the lint result** — `npm run lint` from `frontend/` exits 0 with no output.
7. **Show DevTools Console tab** — empty (no errors, no logs).

## Known limits (deliberate, scoped to Lab 2)

- **No client-side routing** — each page is still its own HTML file. `article.html?slug=…` is a query parameter, not a SPA route. React Router arrives in Lab 3.
- **No form validation** beyond what the browser does natively (`required`, `type="password"`). Inline error messages on bad credentials are shown, but rich client-side validation comes in Lab 3+.
- **Edit / moderation flows are not wired yet** — they remain Lab 1 mock-ups. Lab 4 wires them with React.
- **Live GH Pages site** still serves Lab 1's static layout — the JS detects non-localhost hostnames and skips fetch so the public site doesn't show error states for an unreachable backend. To demo Lab 2 you must run it locally per the steps above.

## Where to find what

```
frontend/
├── package.json          # adds eslint, eslint-config-airbnb-base, eslint-plugin-import
├── .eslintrc.json        # spec's exact config (airbnb-base, indent 4, linebreak-style off)
├── .eslintignore         # node_modules/ + compiled CSS
└── pages/
    ├── *.html            # 11 pages from Lab 1 — now with <body data-page="..."> + <script type="module">
    ├── js/               # ← Lab 2 source code lives here
    └── styles/main.css   # unchanged from Lab 1
```

For the architectural rationale see [`docs/architecture.md`](docs/architecture.md) and the [design doc](docs/plans/2026-05-06-stones-encyclopedia-design.md#lab-2--ajax--linter-10-pts).
