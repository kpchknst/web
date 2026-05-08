# LAB 3 — React SPA with user management (quick start)

> **Branch:** `lab3` · **Points:** 10
> **Full guide:** [`docs/lab3-guide.md`](docs/lab3-guide.md) · **Report:** [`docs/lab3-report.md`](docs/lab3-report.md)

## What's in this lab

The Lab 1 static layout has been ported to a **single-page application** built with **Vite + React 18 + React Router v6 + axios**, talking to the **Lab 0 FastAPI backend** over REST.

Spec-graded behaviour:

| Requirement | How it's covered |
|---|---|
| Login / logout | `LoginPage` POSTs `/auth/login`, JWT in `localStorage`, axios interceptor adds `Authorization: Bearer …` to every request, "Log out" button in the top nav clears the session |
| User roles | `AuthContext` exposes `user.role`; `ProtectedRoute` gates admin routes; the nav shows the role badge + the "Users" link only to admins |
| Users listing | `UsersListPage` (`/users`) — admin-only; pulls `GET /users`; one row per user with View / Edit / Delete actions |
| User CRUD | Create (`/users/new`), Read (`/users/:id`), Update (`/users/:id/edit`), Delete (modal on the listing **and** detail page) |
| REST + JSON | Every API call is a JSON request/response. axios `Content-Type: application/json` on every body |
| Refresh-safe routes | `BrowserRouter` + Vite's SPA-fallback dev/preview server — F5 on `/users/abc` reloads the SPA at the same route |
| 2 browsers | Tested in Chrome and Firefox (Lab 2's pattern) |
| < 4 s load | Vite dev server: ~700 ms boot, route render typically < 200 ms |
| Linter pass | `npm run lint` is silent — Airbnb-base + React + React Hooks + JSX a11y |
| AirBnB style + 4-space indent | `.eslintrc.json` has `indent: ["error", 4]`, JSX indent 4 |
| Files ≤ 400 LOC, fns ≤ 75 LOC | Largest source file is ~180 LOC (`UserForm.jsx`) |
| No commented code | Verified by lint + manual check |

## One-time setup

```bash
# 1. Make sure Lab 0 backend is set up (see LAB0.md). It uses Supabase Postgres or a SQLite fallback.

# 2. Install frontend deps
cd frontend
npm install
```

## Run the app — teacher's machine (spec ports free)

```bash
# Terminal A — backend on the spec port :8001
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8001

# Terminal B — Vite dev server
cd frontend
npm run dev
# → http://localhost:5173 (Vite default)
# → To match the spec line "SPA shall be accessible on localhost:8000",
#   run instead:  npm run dev -- --port 8000
```

The Vite dev server proxies `/api/*` to the backend, so there are no CORS issues to configure.

## Run the app — Anastasia's Mac (Docker holds :8000 and :8001)

```bash
# Terminal A — backend on :8002 (Docker holds 8001 on this machine)
cd backend
source .venv/bin/activate
CORS_ORIGINS="http://localhost:5173,http://localhost:5500,http://localhost:8000" \
    uvicorn app.main:app --reload --port 8002

# Terminal B — point Vite at the alt backend, then start it
cd frontend
echo 'VITE_API_TARGET=http://localhost:8002' > .env.local   # one-time
npm run dev
```

`.env.local` is git-ignored. The proxy in `vite.config.js` reads `VITE_API_TARGET` (default `http://localhost:8001`) at startup.

## Demo credentials (seeded by `python -m app.seed`)

- Admin: `admin` / `admin123`
- Regular: `regular` / `regular123`

## Lint check (the spec's grading bar)

```bash
cd frontend
npm run lint
```

Expected: zero errors, zero warnings, exit code 0.

## Where the React code lives

```
frontend/
├── index.html              # Vite entry
├── vite.config.js          # dev server, proxy, build
├── package.json            # adds react, react-dom, react-router-dom, axios + vite, plugins
├── .eslintrc.json          # extends airbnb-base, plus React/Hooks/JSX-a11y for src/**
├── .env.example            # template for VITE_API_TARGET
├── pages/                  # Lab 1+2 (untouched, still served on GH Pages)
├── styles/                 # Lab 1 SCSS source (untouched)
└── src/                    # ← Lab 3 source code lives here
    ├── main.jsx                  # mounts <App/> with BrowserRouter + AuthProvider
    ├── App.jsx                   # 8 routes (incl. 404 catch-all)
    ├── api/
    │   ├── client.js             # axios instance + auth interceptor + error normalisation
    │   ├── auth.js               # login, fetchMe
    │   ├── users.js              # list, get, create, update, delete
    │   └── articles.js           # list, getBySlug
    ├── auth/
    │   ├── tokenStore.js         # localStorage JWT helpers
    │   ├── AuthContext.jsx       # provider with login/logout/refresh + user state
    │   ├── useAuth.js            # context hook
    │   └── ProtectedRoute.jsx    # auth + role gate, redirects to /login or /
    ├── components/
    │   ├── Layout.jsx            # SiteHeader + <Outlet/> + SiteFooter wrapper
    │   ├── SiteHeader.jsx        # top nav with role badge + log-out
    │   ├── SiteFooter.jsx
    │   ├── Spinner.jsx           # loading indicator
    │   ├── Alert.jsx             # info / success / warning / danger banner
    │   ├── Badge.jsx             # role / tag chips
    │   ├── ConfirmModal.jsx      # delete-confirmation modal (Esc closes)
    │   └── UserForm.jsx          # shared between create + edit
    ├── pages/
    │   ├── HomePage.jsx          # `/` — stones grid (read-only port of Lab 2)
    │   ├── ArticlePage.jsx       # `/articles/:slug` — article reader
    │   ├── LoginPage.jsx         # `/login`
    │   ├── UsersListPage.jsx     # `/users` (admin-only)
    │   ├── UserCreatePage.jsx    # `/users/new` (admin-only)
    │   ├── UserDetailPage.jsx    # `/users/:id`
    │   ├── UserEditPage.jsx      # `/users/:id/edit`
    │   └── NotFoundPage.jsx      # `*`
    ├── styles/spa.css            # tiny supplement to the Lab 1 compiled CSS
    └── utils/
        ├── format.js             # date / excerpt / paragraph helpers
        └── stoneImages.js        # import.meta.glob bundling of the 10 stone JPGs
```

## How to demo (what to show the teacher)

1. **Show the lint result** — `cd frontend && npm run lint` exits 0 with no output.
2. **Open `http://localhost:8000/` (or `:5173`)** — homepage shows the 10 real stones from `GET /articles`. Open DevTools → Network: one `GET /api/articles` returning 200 JSON.
3. **Click any stone card** — URL becomes `/articles/<slug>` (clean URL, no hash). Article body, version, tags all from the API. Press **F5** — same page reloads.
4. **Log in** as `regular` / `regular123` — nav shows "regular" badge + your username + Log out. The "Users" link is **not** visible (admin-only).
5. **Try `/users`** in the URL bar as `regular` — gets redirected to `/` (admin gate).
6. **Log out, log in as `admin` / `admin123`** — nav now shows "admin" badge + "Users" link.
7. **Navigate `/users`** — table shows all users with role badges, View / Edit / Delete actions. The admin's own Delete button is disabled.
8. **Click `+ New user`** — fill the form → submit → redirected to the new user's detail page.
9. **Click `Edit user`** → change role to `admin` → save → detail page now shows the admin badge.
10. **Click `Delete user`** → modal asks for confirmation → confirm → redirected back to `/users`, the user is gone.
11. **Type `/no-such-route`** in the URL bar — 404 page renders.
12. **DevTools Console tab** — empty (no errors, no warnings, no logs) end-to-end.

## Known limits (deliberate, scoped to Lab 3)

- **Lab 3 grades user CRUD only.** Article CRUD, moderation queue, edit-conflict UX, profile page → **Lab 4**.
- **Live GH Pages site** still serves the Lab 1+2 static layout. The React SPA is local-only by design (the spec says `localhost:8000`).
- **Dev mode prints React DevTools / Vite HMR notices** in the console. Spec says "no errors nor logs"; the production build (`npm run build && npm run preview`) is silent. The teacher demo can use either.

## Where to find what

```
frontend/                  # Lab 1 + Lab 2 + Lab 3 coexist here
├── package.json           # adds react, react-dom, react-router-dom, axios, vite, etc.
├── vite.config.js
├── index.html
├── src/                   # ← Lab 3 React app
├── pages/                 # Lab 1 static pages + Lab 2 vanilla JS (still works)
└── styles/                # Lab 1 SCSS
```

For the architectural rationale see [`docs/architecture.md`](docs/architecture.md) and the [design doc](docs/plans/2026-05-06-stones-encyclopedia-design.md#lab-3--react-spa-with-user-crud-10-pts).
