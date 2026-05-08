# Lab 3 build guide — React SPA with user CRUD

> Audience: **you (Anastasia)**, building Lab 3 from scratch on a fresh
> machine. Every command is meant to be copy-pasted in order. Lab 0 (FastAPI
> backend) and Lab 1 (compiled SCSS, stone images) **must already be in
> place** — the SPA reuses the Lab 1 compiled `pages/styles/main.css` for its
> visual layer and the Lab 1 stone JPEGs for the homepage cards.

The lab is graded out of **10 points**: vanilla-React rewrite of the
frontend, JWT auth in `localStorage` with an axios interceptor, refresh-safe
React Router routes, full **user CRUD** (list / create / read / update /
delete), AirBnB-style ESLint, files ≤ 400 LOC, functions ≤ 75 LOC, no console
errors, two browsers (Chrome + Firefox), the SPA hosted on a localhost port
the spec calls "8000".

---

## 0. Prerequisites

You should have:

- The repo at `~/uni/2_kurs/ВТіВД/web/` checked out on a branch that already
  contains Lab 0 + Lab 1 + Lab 2 (i.e. `development` or `main` after PR #9
  was merged).
- Node 20+ (`node -v`), npm 10+ (`npm -v`), Python 3.11+, the backend's
  `.venv` already created and `pip install -r requirements.txt` already run.
- `backend/.env` with a working `DATABASE_URL` (Supabase Session pooler) and
  `JWT_SECRET`. If not, copy `backend/.env.example` → `backend/.env` and fill
  in real values from the Supabase dashboard. **Never paste secrets in chat
  or commit `.env`.**

Quick sanity check:

```bash
cd ~/uni/2_kurs/ВТіВД/web
git status                                      # working tree clean
gh auth status                                  # Active account: kpchknst
git checkout development                        # start from a green base
```

---

## 1. Branch off `development`

The spec rule: every lab gets its own `lab{N}` branch, never deleted, with at
least one descriptive commit. PRs merge with **merge-commits** (no squash).

```bash
git checkout development
git pull --ff-only origin development
git checkout -b lab3
```

You'll commit and push `lab3` after the build is green; do **not** commit
half-broken work.

---

## 2. Add React + Vite + Router + axios

The Lab 1 / Lab 2 frontend uses npm with ESLint + sass. Lab 3 layers Vite +
React on top; the static `pages/` directory keeps working unchanged so the
GitHub Pages deploy is unaffected.

```bash
cd frontend
npm install --save react@^18 react-dom@^18 react-router-dom@^6 axios@^1
npm install --save-dev vite@^5 @vitejs/plugin-react@^4 \
    eslint-plugin-react@^7 eslint-plugin-react-hooks@^4 eslint-plugin-jsx-a11y@^6
```

Then add four new npm scripts and bump the package version:

```jsonc
// frontend/package.json — only the changed parts
{
    "version": "0.3.0",
    "description": "Stones & Scents Encyclopedia frontend (Lab 1 static layout, Lab 2 AJAX wiring, Lab 3 React SPA).",
    "scripts": {
        "scss": "sass --no-source-map --style=compressed styles/main.scss pages/styles/main.css",
        "scss:watch": "sass --watch styles/main.scss:pages/styles/main.css",
        "scss:expanded": "sass --no-source-map --style=expanded styles/main.scss pages/styles/main.css",
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview",
        "lint": "eslint \"**/*.{js,jsx}\" --ignore-pattern node_modules/"
    }
}
```

> If npm complains about peer-dep conflicts on Node 20, run with
> `npm install --legacy-peer-deps` once — Airbnb-base 15 still pins to a
> slightly older eslint than React's plugin tree assumes.

---

## 3. Vite config + entry HTML

Vite loads its entry HTML from the project root and proxies `/api/*` to the
FastAPI backend so the browser never sees a CORS preflight. Two new files:

`frontend/vite.config.js`:

```js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const apiTarget = env.VITE_API_TARGET || 'http://localhost:8001';

    return {
        plugins: [react()],
        server: {
            port: 5173,
            strictPort: false,
            open: false,
            proxy: {
                '/api': {
                    target: apiTarget,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api/, ''),
                },
            },
        },
        preview: { port: 4173 },
        build: { outDir: 'dist', sourcemap: false },
    };
});
```

`frontend/index.html`:

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Stones & Scents Encyclopedia — React SPA with user management.">
    <title>Stones & Scents — SPA</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

`frontend/.env.example` — template (commit this; **never** commit `.env.local`):

```
VITE_API_TARGET=http://localhost:8001
```

`frontend/.env.local` — your local override on this Mac (Docker holds 8001):

```
VITE_API_TARGET=http://localhost:8002
```

---

## 4. ESLint — add a `src/**` override

Lab 2's `.eslintrc.json` only knew about Airbnb-base for vanilla JS. Add an
**override** for `src/**` that layers React + React-Hooks + JSX-a11y on top
and forces 4-space JSX indentation. Append the `dist/` and `.vite/` patterns
to `.eslintignore`.

The full updated `frontend/.eslintrc.json` is already in the repo — open it
to see the structure. Two things to check:

- The base block keeps `"indent": ["error", 4]` and the
  `no-param-reassign` ignore-list.
- The override block adds `"react/jsx-indent": ["error", 4]`,
  `"react/jsx-filename-extension"` for `.jsx`,
  `"react/function-component-definition"` (named-declarations),
  and `"jsx-a11y/label-has-associated-control"` set to `"either"` so the
  `htmlFor → id` pattern in `LoginPage` and `UserForm` lints clean.

Once both files are saved:

```bash
npm run lint
```

This must produce **zero output** and exit code 0 before you go further. If
it doesn't, fix the lint errors first — every page below assumes a clean
baseline.

---

## 5. Lay out `src/`

The folder structure (each file ≤ 400 LOC, every function ≤ 75 LOC):

```
frontend/src/
├── main.jsx                # mounts <App/> with BrowserRouter + AuthProvider
├── App.jsx                 # <Routes> for 8 routes (incl. 404 catch-all)
├── api/
│   ├── client.js           # axios instance + auth interceptor + error normaliser
│   ├── auth.js             # POST /auth/login, GET /auth/me
│   ├── users.js            # CRUD: list, get, create, update, delete
│   └── articles.js         # GET /articles, GET /articles/:slug
├── auth/
│   ├── tokenStore.js       # localStorage helpers (get/set/clear token)
│   ├── AuthContext.jsx     # provider with user/loading/login/logout/refresh
│   ├── useAuth.js          # `useContext(AuthContext)` hook
│   └── ProtectedRoute.jsx  # redirects to /login (or / for non-admins)
├── components/
│   ├── Layout.jsx          # SiteHeader + <Outlet/> + SiteFooter
│   ├── SiteHeader.jsx      # nav with role badge, username link, log-out btn
│   ├── SiteFooter.jsx
│   ├── Spinner.jsx         # 3-dot loading indicator
│   ├── Alert.jsx           # info / success / warning / danger banner
│   ├── Badge.jsx           # role / tag chips
│   ├── ConfirmModal.jsx    # delete-confirmation modal (Esc closes)
│   └── UserForm.jsx        # shared between create + edit pages
├── pages/
│   ├── HomePage.jsx        # `/` — stones grid (read-only port of Lab 2)
│   ├── ArticlePage.jsx     # `/articles/:slug` — article reader
│   ├── LoginPage.jsx       # `/login`
│   ├── UsersListPage.jsx   # `/users` (admin-only)
│   ├── UserCreatePage.jsx  # `/users/new` (admin-only)
│   ├── UserDetailPage.jsx  # `/users/:id`
│   ├── UserEditPage.jsx    # `/users/:id/edit`
│   └── NotFoundPage.jsx    # `*`
├── styles/
│   └── spa.css             # spinner, 404 page, login form-error — supplements Lab 1 main.css
└── utils/
    ├── format.js           # formatDate, splitParagraphs, buildExcerpt
    └── stoneImages.js      # import.meta.glob() of pages/assets/stones/*.jpg
```

Build it bottom-up:

1. **`tokenStore.js`** first — pure localStorage wrappers, three exports
   (`getToken`, `setToken`, `clearToken`). Wrap each in `try/catch` so
   private-mode browsers don't blow up.
2. **`api/client.js`** — `axios.create({ baseURL: '/api' })` (with a
   `localStorage.apiBase` override so you can retarget in DevTools without a
   recompile, mirroring Lab 2). Two interceptors: a request one that adds
   `Authorization: Bearer …` if a token is present, and a response one that
   clears the token on 401 and converts FastAPI's
   `{detail: "..."} | {detail: [{msg: "..."}]}` into a plain `Error` with a
   `.status` property the pages can read.
3. **`api/auth.js`, `users.js`, `articles.js`** — thin wrappers around
   `client`, one function per endpoint. Always return `data`, never the full
   axios response — the pages don't care about headers.
4. **`AuthContext.jsx`** — exposes `{ user, loading, login, logout, refresh }`.
   On mount, if a token exists, call `GET /auth/me` and seed `user`;
   otherwise set `loading: false` and stay anonymous.
5. **`useAuth.js`** — one-liner: `export default () => useContext(AuthContext)`.
6. **`ProtectedRoute.jsx`** — `children` plus a `requireAdmin` boolean. While
   `loading`, render a `<Spinner/>`. After loading, redirect to `/login` if no
   user, then to `/` if `requireAdmin && user.role !== 'admin'`.
7. **`Layout`, `SiteHeader`, `SiteFooter`** — header shows the role badge,
   the user's username (linking to `/users/:id`), and a `Log out` button only
   when authenticated. The "Users" nav link is admin-only.
8. **`Spinner`, `Alert`, `Badge`, `ConfirmModal`, `UserForm`** — small,
   stateless wrappers. `ConfirmModal` listens to the `Escape` key while open.
9. **Pages** — each has the same `useState` shape: `data`, `loading`,
   `error`. `useEffect` cancels its in-flight fetch on unmount via a
   `cancelled` flag.
10. **`App.jsx`** — eight `<Route>`s: `/`, `/articles/:slug`, `/login`,
    `/users` (admin), `/users/new` (admin), `/users/:id` (auth-only),
    `/users/:id/edit` (auth-only), and `*` for the 404. All wrapped in a
    parent `<Route element={<Layout/>}>` so the header/footer always render.
11. **`main.jsx`** — `createRoot` + `<BrowserRouter future={...}>` to suppress
    the `v7_startTransition` deprecation warning from React Router v6, plus
    the AuthProvider.

The exact file contents already live in `frontend/src/`; they are short
enough that you can read them top-to-bottom in one sitting. The point of this
guide is the *order* in which you write them, not a re-paste of every line.

---

## 6. Style supplement

`frontend/src/styles/spa.css` is < 100 lines: just the spinner animation, the
404 page card, the login form-error pill, and a `.site-nav__username` rule
(the only nav element Lab 1 didn't already style). Everything else — buttons,
form fields, badges, the user table, modal — comes from the **Lab 1
compiled** `pages/styles/main.css`, which `main.jsx` imports first. That keeps
the SPA visually identical to the static site, which is the whole point of
Lab 3 (port the layout, don't redesign).

---

## 7. Run the dev server

Two terminals:

```bash
# Terminal A — backend (Anastasia's Mac: 8002 because Docker holds 8001)
cd backend
source .venv/bin/activate
CORS_ORIGINS="http://localhost:5173,http://localhost:8000" \
    uvicorn app.main:app --reload --port 8002

# Terminal B — Vite dev server
cd frontend
npm run dev                      # → http://localhost:5173
# To match the spec's "localhost:8000":
npm run dev -- --port 8000
```

The Vite proxy reads `VITE_API_TARGET` from `.env.local` and forwards
`/api/*` to it, so you'll see backend logs in Terminal A as you click around
the SPA.

> On the **teacher's machine** the backend port is just `8001` (no Docker
> conflict) — drop the `CORS_ORIGINS` override and skip `.env.local`.

---

## 8. End-to-end smoke checklist

Open the app in Chrome and Firefox. In each:

1. **Home (`/`)** — 10 cards from `GET /articles`. DevTools → Network shows
   one `GET /api/articles` returning **200**.
2. **Click any stone** — URL is `/articles/<slug>` (clean, no hash). Body
   text, version, tags all from the API. Press **F5** — same article reloads.
3. **`/login`** — try `bad`/`bad`. Form-error pill says "Invalid username
   or password." Now `regular` / `regular123` — nav shows the regular badge,
   the username link, the Log out button. **No** "Users" link.
4. **Type `/users` in the URL bar** as `regular` — redirected to `/`.
5. **Log out → log in as `admin` / `admin123`** — nav shows the admin badge
   *and* the "Users" link.
6. **`/users`** — table with all users, `View / Edit / Delete` actions.
   Admin's own Delete button is **disabled** with a tooltip explaining why.
7. **`+ New user`** — username `lab3-test`, password `testpass1`, confirm
   matches, role `regular`, submit. You land on the new user's detail page.
8. **`Edit user`** → change role to `admin` → save. Detail page shows the
   admin badge for that user.
9. **`Delete user` button** → modal appears → confirm. Back at `/users`,
   `lab3-test` is gone.
10. **Type `/no-such-route`** — 404 page renders.
11. **Console tab is empty** — no errors, no warnings, no logs (StrictMode
    re-renders are silent).

If any step fails, read Terminal A's FastAPI log first — most surprises
trace to a stale token, the wrong `VITE_API_TARGET`, or Supabase
connection-pool throttling.

---

## 9. Production build smoke (optional)

```bash
cd frontend
npm run build      # → dist/ — JS ~233 KB, gzip ~77 KB; ten stone JPEGs hashed
npm run preview    # → http://localhost:4173 — the dist served statically
```

The build output should mention 122 transformed modules and finish in
~1 second on this Mac. If you ever want to deploy the SPA to Vercel /
Netlify, this is the artefact — but the spec only requires `localhost:8000`.

---

## 10. Quality bar before commit

- [ ] `npm run lint` exits 0 with **no output**.
- [ ] `npm run build` succeeds in < 5 s with no warnings.
- [ ] Smoke checklist (Section 8) passes in **Chrome and Firefox**.
- [ ] Console panel is empty after the full flow.
- [ ] Largest source file is under 400 LOC; longest function under 75 LOC.
- [ ] No commented-out code. No `console.log`. No `TODO` stubs.
- [ ] `frontend/.env.local` is git-ignored (already in `.gitignore`).
- [ ] `gh auth status` shows **Active account: kpchknst**.

---

## 11. Commit, push, PR

```bash
cd ~/uni/2_kurs/ВТіВД/web
git status                      # review what changed
git add LAB3.md docs/lab3-guide.md docs/lab3-report.md \
        frontend/index.html frontend/vite.config.js frontend/.env.example \
        frontend/.eslintrc.json frontend/.eslintignore \
        frontend/package.json frontend/package-lock.json \
        frontend/src/

git commit -m "lab3: React SPA with user CRUD, JWT auth, axios + Router"

git push -u origin lab3
```

Open the PR with the `gh` CLI to keep the merge-commit flow:

```bash
gh pr create --base development --head lab3 \
    --title "Lab 3 — React SPA with user CRUD" \
    --body  "Vite + React 18 + Router v6 + axios. JWT in localStorage with auth interceptor. Full user CRUD (list/create/read/update/delete) gated on role. Refresh-safe routes via BrowserRouter. ESLint Airbnb-base + React + JSX-a11y, all clean. Smoke-tested end-to-end against real Supabase Postgres."

# After review, merge with a merge-commit (NOT squash):
gh pr merge --merge

# Then promote to main:
git checkout development && git pull --ff-only
git checkout -b dev-to-main-lab3
git push -u origin development
gh pr create --base main --head development \
    --title "Promote: development → main with Lab 3" \
    --body  "Lab 3 React SPA, all gates passed."
gh pr merge --merge
```

The `lab3` branch is **never deleted** — keep it on the remote for the
teacher to `git checkout lab3` straight to the graded snapshot.
