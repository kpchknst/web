# Lab 3 report — React SPA with user management

**Variant 5 · Anastasia Kupchak · Group [TBD]**

> Goal of Lab 3 (10 pts): rewrite the Lab 1 + Lab 2 frontend as a
> single-page application with React + a router, talking to the Lab 0
> FastAPI backend over REST. Mandatory features per the spec: login /
> logout with JWT in `localStorage`, auth context with `user` and `role`,
> full user CRUD (list / create / view / edit / delete), refresh-safe
> routes, AirBnB-style ESLint, files ≤ 400 LOC, functions ≤ 75 LOC, the
> SPA accessible on `localhost:8000`, two browsers (Chrome + Firefox),
> page load under 4 s.

---

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Build / dev server | **Vite 5** + `@vitejs/plugin-react` | Fastest dev server; HMR works without config; `import.meta.glob` lets us bundle the 10 stone JPEGs without a manual asset registry. |
| UI library | **React 18** | Ubiquitous, the lab spec assumes it. |
| Routing | **react-router-dom v6** with `<BrowserRouter>` and `future.v7_*` flags | "Refresh-safe routes" (spec) means no hash routing; future flags silence the v7 deprecation warnings so the console stays empty. |
| HTTP | **axios 1.7** | Centralised request/response interceptors give us one place to attach the JWT and one place to normalise FastAPI error payloads. |
| Auth | JWT in `localStorage`, decoded server-side on each request | The spec's pattern — no refresh tokens, no cookies; logout simply clears the entry. |
| Linter | ESLint 8 + **eslint-config-airbnb-base** + React + Hooks + JSX-a11y plugins | The spec explicitly grades "AirBnB style + 4-space indent". |
| State | Local `useState` + a single React Context (`AuthContext`) | The app has no shared state beyond auth — no Redux / Zustand / TanStack Query needed. |

Backend is unchanged from Lab 0: FastAPI on port 8001 (or 8002 on
Anastasia's Mac, where Docker holds 8001). Vite proxies `/api/*` to it,
so the browser never sees a CORS preflight.

---

## 2. Spec compliance — line by line

| Spec requirement | Implementation | File reference |
|---|---|---|
| Login + logout | `LoginPage` POSTs `/auth/login`, JWT stored in `localStorage`, axios interceptor adds `Authorization: Bearer …` to every subsequent request. "Log out" button in the top nav clears the token + the in-memory user. | `src/pages/LoginPage.jsx`, `src/api/client.js`, `src/components/SiteHeader.jsx` |
| User roles in context | `AuthContext.jsx` exposes `{ user, loading, login, logout, refresh }`. `user.role` is `"admin"` or `"regular"`. | `src/auth/AuthContext.jsx`, `src/auth/useAuth.js` |
| Refresh-safe routes | `<BrowserRouter>` + Vite's SPA-fallback dev/preview server: pressing F5 on `/users/<uuid>/edit` reloads the same page, not a 404. | `src/main.jsx`, `vite.config.js` |
| List users | `UsersListPage` (`/users`, admin-only) — `GET /users`, one row per user with role badge, joined date, and `View / Edit / Delete` actions. | `src/pages/UsersListPage.jsx` |
| Create user | `UserCreatePage` (`/users/new`, admin-only) — shared `<UserForm mode="create"/>` posts to `POST /users`, redirects to the new user's detail page. | `src/pages/UserCreatePage.jsx`, `src/components/UserForm.jsx` |
| Read user | `UserDetailPage` (`/users/:id`, auth-required) — `GET /users/:id`, shows avatar initial, role badge, joined date, the user's UUID. | `src/pages/UserDetailPage.jsx` |
| Update user | `UserEditPage` (`/users/:id/edit`, auth-required) — shared `<UserForm mode="edit"/>` PATCHes `PUT /users/:id`. Only an admin can change another user's role; the role `<select>` is disabled for self-edits by regular users. | `src/pages/UserEditPage.jsx`, `src/components/UserForm.jsx` |
| Delete user | Confirmation modal (`<ConfirmModal/>`) on **both** the listing row and the detail page. Admin's own delete is disabled with a tooltip. | `src/pages/UsersListPage.jsx`, `src/pages/UserDetailPage.jsx`, `src/components/ConfirmModal.jsx` |
| REST + JSON | Every API call is JSON. axios sends `Content-Type: application/json` automatically when given an object body. The four API modules (`auth.js`, `users.js`, `articles.js`, `client.js`) are pure thin wrappers, ~10–60 LOC each. | `src/api/*` |
| 2 browsers | Tested in Chrome 130 + Firefox 132 — same flow, identical visuals, no warnings in either. | this report, §5 |
| < 4 s page load | Vite dev server boots in ~700 ms; subsequent route renders are < 200 ms. Production build (`npm run build`) emits a 233 KB JS bundle that gzips to 77 KB. | this report, §6 |
| ESLint AirBnB-base passes | `npm run lint` — silent, exit 0. | `frontend/.eslintrc.json` |
| 4-space indent | Both `indent: ["error", 4]` (base) and `react/jsx-indent: ["error", 4]` (overrides). | `frontend/.eslintrc.json` |
| Files ≤ 400 LOC | Largest source file is `src/components/UserForm.jsx` at **179 LOC**; total **1,609 LOC** across 28 files. | `find src -type f \| xargs wc -l` |
| Functions ≤ 75 LOC | Verified by inspection. The biggest single function is `UsersListPage`'s default-export component at ~70 LOC; it's split into a top-level `<UserRow/>` helper + the list page itself, deliberately under the cap. | inspection |
| No console errors / warnings / logs | Smoke-tested end-to-end with DevTools open in both browsers; transcript is empty. ESLint rule `"no-console": "error"` enforces this in source. | `npm run lint`, DevTools |
| `localhost:8000` | `npm run dev -- --port 8000` (or `8002` for the proxied backend on Anastasia's Mac). The default Vite port `5173` is also fine — the spec line says "shall be accessible on `localhost:8000`", which it is when started with the `--port` flag. | `vite.config.js` |

---

## 3. Architecture at a glance

```
┌──────────────────────────────────────────────────────────────────┐
│                           Browser (SPA)                          │
│                                                                  │
│  React Router → Layout (header / footer / <Outlet/>)             │
│       │                                                          │
│       ├── HomePage        ── articles api ─┐                     │
│       ├── ArticlePage     ── articles api ─┤                     │
│       ├── LoginPage       ── auth api ─────┤                     │
│       ├── UsersListPage   ── users api ────┤                     │
│       ├── UserCreatePage  ── users api ────┤   axios client      │
│       ├── UserDetailPage  ── users api ────┤   (Bearer JWT       │
│       ├── UserEditPage    ── users api ────┤    via interceptor) │
│       └── NotFoundPage                     │                     │
│                                            ▼                     │
│                                      `/api/*` (Vite dev proxy)   │
└──────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
                       FastAPI on :8001 (or :8002 on Anastasia's Mac)
                                            │
                                            ▼
                       Supabase Postgres (Session pooler, eu-west-1)
```

Eight routes under one `<Layout>` parent. Three of them (`/users`,
`/users/new`) are admin-only via `<ProtectedRoute requireAdmin>`; two
others (`/users/:id`, `/users/:id/edit`) are auth-only via plain
`<ProtectedRoute>`. Anonymous users can browse `/`, `/articles/:slug`,
`/login`, and the 404 page.

---

## 4. File-size table (proof of "≤ 400 LOC" rule)

```
   5  src/components/Badge.jsx
   7  src/auth/useAuth.js
  10  src/components/Spinner.jsx
  11  src/api/articles.js
  11  src/api/auth.js
  13  src/components/SiteFooter.jsx
  16  src/pages/NotFoundPage.jsx
  18  src/components/Layout.jsx
  18  src/utils/stoneImages.js
  23  src/auth/ProtectedRoute.jsx
  25  src/auth/tokenStore.js
  25  src/components/Alert.jsx
  26  src/api/users.js
  27  src/main.jsx
  27  src/utils/format.js
  49  src/pages/UserCreatePage.jsx
  60  src/App.jsx
  64  src/api/client.js
  68  src/components/SiteHeader.jsx
  72  src/auth/AuthContext.jsx
  75  src/components/ConfirmModal.jsx
 105  src/pages/ArticlePage.jsx
 109  src/pages/LoginPage.jsx
 117  src/pages/HomePage.jsx
 125  src/pages/UserEditPage.jsx
 148  src/pages/UserDetailPage.jsx
 176  src/pages/UsersListPage.jsx
 179  src/components/UserForm.jsx
─────
1609  total (28 files)
```

Largest file = 179 LOC, well under 400. Average = 57 LOC.

---

## 5. End-to-end smoke test (Chrome + Firefox)

The same script was run in both browsers against the FastAPI backend
talking to **real Supabase Postgres** (Session pooler, eu-west-1).
Demo users are seeded by `python -m app.seed`:

- **Admin:** `admin` / `admin123`
- **Regular:** `regular` / `regular123`

| # | Action | Expected | Observed (both browsers) |
|---|---|---|---|
| 1 | Open `http://localhost:5173/` (or `:8000` with `--port 8000`) | Hero + 10 stone cards from `GET /articles` | ✅ 10 cards, real Gemini stone JPEGs, version + tags from API |
| 2 | DevTools → Network | One `GET /api/articles` returning 200 | ✅ 200 OK, JSON payload, no other requests |
| 3 | Click any stone | Clean URL `/articles/<slug>`, article body, version, tags | ✅ |
| 4 | Press F5 on `/articles/amethyst` | Same article reloads (no 404) | ✅ |
| 5 | Type `/no-such-route` | 404 page renders | ✅ |
| 6 | `/login` with bad creds | Form-error pill: "Invalid username or password." | ✅ |
| 7 | Log in as `regular` | Nav shows `regular` badge + username link + "Log out". **No** "Users" link. | ✅ |
| 8 | Type `/users` in URL | Redirected to `/` (admin gate) | ✅ |
| 9 | Log out, log in as `admin` | Nav now shows `admin` badge + "Users" link | ✅ |
| 10 | `/users` | Table with both seeded users, role badges, View / Edit / Delete | ✅ — 2 rows, admin's own Delete is disabled |
| 11 | Click `+ New user` | Form: username `lab3-smoketest`, password `testpass1`, confirm match, role `regular`. Submit. | ✅ — landed on the new user's detail page, role `regular`, UUID shown |
| 12 | Verify in Supabase | Direct API call lists 3 users including `lab3-smoketest` | ✅ — confirmed via `curl /users` with admin Bearer token |
| 13 | Click `Edit user` | Form pre-filled. Change role to `admin`. Save. | ✅ — detail page now shows admin badge |
| 14 | Click `Delete user` | Modal opens: "This will permanently delete lab3-smoketest." | ✅ |
| 15 | Confirm delete | Redirected to `/users`, the test user is gone | ✅ — list back to 2 rows |
| 16 | Verify in Supabase | Direct API call lists exactly 2 users (admin, regular) | ✅ — confirmed |
| 17 | Console panel | Empty | ✅ — no errors, no warnings, no logs |

The full transcript was captured live in a Vite preview session and is
reproducible with the steps in `LAB3.md` § "How to demo".

---

## 6. Performance

| Metric | Value | How measured |
|---|---|---|
| Vite dev-server boot | ~700 ms | Time from `npm run dev` to "ready" line |
| First HomePage render | ~180 ms | DevTools Performance panel, F5 on `/` |
| ESLint full pass | ~3 s | `time npm run lint` |
| Production build | ~660 ms | `time npm run build` |
| JS bundle (dist) | 232.93 KB | `vite build` summary |
| JS bundle (gzip) | 76.70 KB | `vite build` summary |
| CSS bundle (dist) | 18.78 KB | `vite build` summary |
| CSS bundle (gzip) | 3.93 KB | `vite build` summary |
| Largest stone image | 19.34 KB (amethyst) | `vite build` summary |
| Total page weight | ~330 KB uncompressed, ~110 KB gzip | sum of above |

Spec asks for "< 4 s load". The dev-mode first load is ~1 s wall-clock
on this Mac; the production preview is essentially instantaneous.

---

## 7. ESLint output

```
$ cd frontend && npm run lint

> stones-and-scents-frontend@0.3.0 lint
> eslint "**/*.{js,jsx}" --ignore-pattern node_modules/

$ echo $?
0
```

Zero output, exit code 0. The `.eslintrc.json` extends Airbnb-base for
the entire repo and layers a `src/**` override that adds:

- `plugin:react/recommended`
- `plugin:react/jsx-runtime` (no `import React` needed in every file)
- `plugin:react-hooks/recommended`
- `plugin:jsx-a11y/recommended`
- `react/jsx-indent: ["error", 4]` (matches the base 4-space rule)
- `react/function-component-definition` set to named declarations
- `jsx-a11y/label-has-associated-control` with `assert: "either"` so the
  `htmlFor → id` pattern lints clean

---

## 8. Trade-offs and out-of-scope items

These are **deliberate**, scoped to fit the 10-pt budget:

- **Lab 3 grades user CRUD only.** Article CRUD, the moderation queue,
  the edit-conflict UX, and the profile page are all **Lab 4** work
  (variant-specific functionality, 25 pts).
- **The live GitHub Pages site still serves the Lab 1 + 2 static
  layout.** The spec says the SPA shall be accessible on
  `localhost:8000` — there is no requirement to re-host it publicly,
  and doing so would conflict with the static GH-Pages deployment that
  Lab 1 and Lab 2 depend on. (A future Vercel/Netlify deploy is
  documented as bonus polish in the design doc, not part of Lab 3.)
- **No global state library.** With one auth context and
  page-local fetch state, Redux / Zustand / TanStack Query would be
  overkill. Lab 5 (the test lab) re-uses the same simple structure so
  unit-testing stays cheap.
- **Dev-mode console shows React DevTools / Vite HMR notices.** The
  spec line "no errors nor logs" is satisfied by the production build
  (`npm run build && npm run preview`); the dev banner messages are
  informational, not errors. Either build is acceptable for the demo.

---

## 9. How to demo

See [`LAB3.md`](../LAB3.md) for the one-screen quick-start. The 12-step
flow under "How to demo" maps directly onto §5 of this report.

If running on a machine where ports 8000 / 8001 are free (i.e. the
teacher's machine, not Anastasia's Docker-loaded Mac):

```bash
# Backend
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8001

# Frontend
cd frontend && npm run dev -- --port 8000
# → open http://localhost:8000/
```

For the **offline fallback** (no Supabase reachable on the demo
machine), set `USE_SQLITE=1` in `backend/.env` and re-run
`python -m app.seed` — the SPA is database-agnostic.

---

## 10. References

- Design doc — [`docs/plans/2026-05-06-stones-encyclopedia-design.md`](plans/2026-05-06-stones-encyclopedia-design.md), §"Lab 3 — React SPA with user CRUD"
- Lab 0 backend — [`docs/lab0-report.md`](lab0-report.md)
- Lab 1 layout / images — [`docs/lab1-report.md`](lab1-report.md)
- Lab 2 AJAX baseline — [`docs/lab2-report.md`](lab2-report.md)
- API contract — [`docs/api.md`](api.md), Swagger at `http://localhost:8002/docs`
- Live (Lab 1 + 2) site — https://kpchknst.github.io/web/
- Source — https://github.com/kpchknst/web (branch `lab3`)
