# Lab 2 — AJAX + ESLint — step-by-step guide

> Audience: **you** (Anastasia). This is the build script. Each step is one command, one file, or one block of code to paste.
>
> **Points:** 10 (single graded chunk — pass/fail per requirement).
>
> **Time estimate:** ~3–4 hours. Most of it is wiring the four UI flows; the linter setup is ~20 minutes.

---

## What you'll deliver

1. **`frontend/package.json` updated** with ESLint + airbnb-base + eslint-plugin-import as dev-dependencies, plus a `lint` script.
2. **`frontend/.eslintrc.json`** with the exact config from the Lab 2 PDF.
3. **`frontend/.eslintignore`** to keep linting scoped to source files.
4. **`frontend/pages/js/`** — eight small ES modules wiring four flows: home, article reader, login, users.
5. **HTML modifications** to `index.html`, `article.html`, `login.html`, `users.html` so they include the script tag and have the IDs / `data-page` attributes the JS needs.
6. **`docs/lab2-report.md`** updated with the actual measurements (load time, browsers tested, screenshots, lint output).
7. **A merge request** `lab2` → `development`, then `development` → `main`.

---

## Pre-flight checklist

```bash
cd /Users/mac/uni/2_kurs/ВТіВД/web
gh auth status                      # active account must be kpchknst
git status                          # working tree should be clean
git checkout development            # start from the integration branch
git pull origin development
git checkout -b lab2                # create the lab branch
node --version                      # node ≥ 18 (any LTS works)
npm --version                       # npm ≥ 9
```

> ⚠️ If `gh auth status` shows `a-kupchak` as active, **stop** and run `gh auth switch -u kpchknst` before you push anything.

---

## Step 1 — Install ESLint and update `package.json`

The Lab 2 PDF pins very old versions (`eslint ^6.8.0`, `eslint-config-airbnb-base ^14.0.0`). Those don't run on modern Node. Bump to the matching modern majors that keep the same config schema:

| Package (PDF) | Used here | Why |
|---|---|---|
| `eslint ^6.8.0` | `eslint ^8.57.0` | ESLint 8.x is the last release that supports the legacy `.eslintrc.json` format that airbnb-base needs (ESLint 9 forces flat config) |
| `eslint-config-airbnb-base ^14.0.0` | `eslint-config-airbnb-base ^15.0.0` | 15.x is what npm actually serves today; the rule set is unchanged for our purposes |
| `eslint-plugin-import ^2.20.1` | `eslint-plugin-import ^2.29.1` | Latest 2.x; same plugin |

### 1a. Update `frontend/package.json`

Replace the file with:

```json
{
  "name": "stones-and-scents-frontend",
  "version": "0.2.0",
  "private": true,
  "description": "Stones & Scents Encyclopedia frontend (Lab 1 static layout + Lab 2 AJAX wiring).",
  "scripts": {
    "scss": "sass --no-source-map --style=compressed styles/main.scss pages/styles/main.css",
    "scss:watch": "sass --watch styles/main.scss:pages/styles/main.css",
    "scss:expanded": "sass --no-source-map --style=expanded styles/main.scss pages/styles/main.css",
    "lint": "eslint \"**/*.js\" --ignore-pattern node_modules/"
  },
  "devDependencies": {
    "eslint": "^8.57.0",
    "eslint-config-airbnb-base": "^15.0.0",
    "eslint-plugin-import": "^2.29.1",
    "sass": "^1.79.0"
  }
}
```

The `lint` script matches the PDF spec: `eslint **/*.js --ignore-pattern node_modules/`. The double quotes around the glob keep zsh/bash from expanding it before ESLint sees it.

### 1b. Install

```bash
cd frontend
npm install
```

You'll see ~70 transitive packages installed. The folder is git-ignored.

### 1c. Verify ESLint binary works

```bash
npx eslint --version
```

Should print `v8.57.0` (or whatever 8.x npm picked).

---

## Step 2 — Create `.eslintrc.json`

The PDF dictates the contents. Bump only `ecmaVersion` from `2018` to `2022` so we can use modern syntax (optional chaining, nullish coalescing, top-level `await` if needed):

`frontend/.eslintrc.json`:

```json
{
    "env": {
        "browser": true,
        "es6": true
    },
    "extends": [
        "airbnb-base"
    ],
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "ecmaVersion": 2022,
        "sourceType": "module"
    },
    "rules": {
        "indent": ["error", 4],
        "linebreak-style": "off",
        "no-console": "error",
        "import/extensions": ["error", "ignorePackages"]
    }
}
```

The two extra rules (`no-console: error` and `import/extensions`) make the spec's "no logs in console" requirement enforceable at lint time and let us write `import './api.js'` with the explicit `.js` extension that browsers actually need.

### Create `.eslintignore`

`frontend/.eslintignore`:

```
node_modules/
pages/styles/
package-lock.json
```

---

## Step 3 — JavaScript source layout

All Lab 2 source code lives under `frontend/pages/js/`. Putting it under `pages/` (instead of a top-level `frontend/js/`) means:

- Locally, when you serve `frontend/pages/` via `python3 -m http.server 8000`, `<script src="js/main.js">` resolves to `frontend/pages/js/main.js`.
- On GitHub Pages, the deploy workflow already copies `frontend/pages/` to `_site/` — so `js/` rides along automatically without any workflow change.

```bash
mkdir -p frontend/pages/js
```

You'll create nine files in this folder:

```
frontend/pages/js/
├── main.js              # entry; dispatches per page
├── api.js               # fetch wrapper + base URL + FastAPI error normalisation
├── auth.js              # localStorage token + Authorization header helper
├── dom.js               # tiny shared helpers: escapeHtml / formatDate / splitParagraphs
├── nav.js               # GET /auth/me → top-bar role badge / Log out
├── articles-list.js     # GET /articles → homepage card grid
├── article-detail.js    # GET /articles/{slug} → article reader
├── login.js             # POST /auth/login → token + redirect
└── users-list.js        # GET /users → admin-only table
```

---

## Step 4 — `js/api.js` (the fetch wrapper)

```js
const API_BASE_DEFAULT = 'http://localhost:8001';

const readOverride = () => {
    try {
        return window.localStorage.getItem('apiBase');
    } catch (_) {
        return null;
    }
};

const API_BASE = readOverride() || API_BASE_DEFAULT;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '']);

export const isLocalEnvironment = () => LOCAL_HOSTS.has(window.location.hostname);

const buildUrl = (path) => {
    const prefix = path.startsWith('/') ? '' : '/';
    return `${API_BASE}${prefix}${path}`;
};

const parseJson = async (response) => {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (cause) {
        const error = new Error('Server returned a malformed JSON response');
        error.cause = cause;
        throw error;
    }
};

const formatDetail = (detail, status) => {
    if (typeof detail === 'string' && detail) return detail;
    if (Array.isArray(detail) && detail.length > 0) {
        return detail
            .map((item) => item.msg || item.message || JSON.stringify(item))
            .join('; ');
    }
    return `Request failed with status ${status}`;
};

export const apiRequest = async (path, options = {}) => {
    const headers = { Accept: 'application/json', ...(options.headers ?? {}) };
    if (options.body !== undefined && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(buildUrl(path), { ...options, headers });
    const body = await parseJson(response);
    if (!response.ok) {
        const rawDetail = body && (body.detail ?? body.message);
        const message = formatDetail(rawDetail, response.status);
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }
    return body;
};

export const apiGet = (path, headers) => apiRequest(path, { method: 'GET', headers });

export const apiPost = (path, payload, headers) => apiRequest(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
});

export { API_BASE };
```

> **Why `formatDetail`?** FastAPI returns 4xx errors with two different shapes: `{detail: "string"}` for HTTPExceptions like 401, and `{detail: [{msg, loc, type, ...}]}` for 422 Pydantic validation failures. Without normalisation, a 422 would surface to the user as `[object Object]` because `new Error([{...}])` stringifies the array poorly.
>
> **Why detect `LOCAL_HOSTS`?** The same JS ships to GitHub Pages (`kpchknst.github.io`). On the live site there is no backend on `localhost:8001`, so attempting `fetch` would log a network error in the console — which the spec forbids. Each per-page module checks `isLocalEnvironment()` and falls back to the static HTML when off-host.
>
> **Why `localStorage.getItem('apiBase')` first?** The teacher's machine has port 8001 free, so the default spec value works. Anastasia's Mac has 8001 held by an unrelated Docker container, so her local backend listens on `:8002` instead. With the override she runs `localStorage.setItem('apiBase', 'http://localhost:8002')` once in DevTools and never edits the source — keeps the committed code spec-aligned.

---

## Step 4b — `js/dom.js` (shared rendering helpers)

Three of the four data-loading modules need the same handful of helpers (HTML-escape, date formatter, paragraph splitter). Extracting them keeps the per-page modules tight:

```js
const HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

export const escapeHtml = (value) => String(value ?? '')
    .replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

export const formatDate = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
};

export const splitParagraphs = (content) => (content ?? '')
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean);

export const buildExcerpt = (content, maxLength = 220) => {
    const trimmed = (content ?? '').replace(/\s+/g, ' ').trim();
    if (trimmed.length <= maxLength) return trimmed;
    return `${trimmed.slice(0, maxLength - 3)}…`;
};
```

Each helper is one short pure function — easy to unit-test in Lab 5.

---

## Step 5 — `js/auth.js` (token storage)

```js
const TOKEN_KEY = 'stones-scents.token';
const ROLE_KEY = 'stones-scents.role';
const USERNAME_KEY = 'stones-scents.username';

export const getToken = () => window.localStorage.getItem(TOKEN_KEY);

export const getStoredUser = () => ({
    username: window.localStorage.getItem(USERNAME_KEY),
    role: window.localStorage.getItem(ROLE_KEY),
});

export const setSession = ({ token, username, role }) => {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USERNAME_KEY, username);
    window.localStorage.setItem(ROLE_KEY, role);
};

export const clearSession = () => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USERNAME_KEY);
    window.localStorage.removeItem(ROLE_KEY);
};

export const authHeader = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};
```

---

## Step 6 — `js/nav.js` (top-bar role badge + log out button)

```js
import { apiGet } from './api.js';
import { authHeader, clearSession, getToken, setSession } from './auth.js';

const findUserSlot = () => document.querySelector('[data-nav-user]');
const findLoginLink = () => document.querySelector('[data-nav-login]');

const renderLoggedOut = (slot, link) => {
    if (slot) slot.hidden = true;
    if (link) link.hidden = false;
};

const renderLoggedIn = (slot, link, user) => {
    if (link) link.hidden = true;
    if (!slot) return;
    slot.hidden = false;
    slot.innerHTML = '';

    const badge = document.createElement('span');
    badge.className = `badge badge--role-${user.role}`;
    badge.textContent = user.role;

    const username = document.createElement('span');
    username.className = 'site-nav__username';
    username.textContent = user.username;

    const logoutButton = document.createElement('button');
    logoutButton.type = 'button';
    logoutButton.className = 'btn btn--secondary btn--small';
    logoutButton.textContent = 'Log out';
    logoutButton.addEventListener('click', () => {
        clearSession();
        window.location.href = 'index.html';
    });

    slot.append(badge, ' ', username, ' ', logoutButton);
};

export const initNav = async () => {
    const slot = findUserSlot();
    const link = findLoginLink();
    if (!getToken()) {
        renderLoggedOut(slot, link);
        return;
    }
    try {
        const me = await apiGet('/auth/me', authHeader());
        setSession({ token: getToken(), username: me.username, role: me.role });
        renderLoggedIn(slot, link, me);
    } catch (error) {
        if (error.status === 401) {
            clearSession();
        }
        renderLoggedOut(slot, link);
    }
};
```

---

## Step 7 — `js/articles-list.js` (homepage)

```js
import { apiGet, isLocalEnvironment } from './api.js';
import { buildExcerpt, escapeHtml } from './dom.js';

const FALLBACK_TAG = 'with-perfume-notes';

const renderCard = (article) => {
    const tagSlugs = (article.tags ?? []).map((tag) => tag.slug);
    const headerTag = tagSlugs[0] ?? FALLBACK_TAG;
    const metaTags = tagSlugs.length === 0 ? FALLBACK_TAG : tagSlugs.join(' · ');
    const slugClass = `card__thumb--${escapeHtml(article.slug)}`;
    const hrefSlug = encodeURIComponent(article.slug);
    return `
        <article class="card">
            <div class="card__thumb ${slugClass}" role="img"
                 aria-label="${escapeHtml(article.title)} illustration"></div>
            <h2 class="card__title">${escapeHtml(article.title)}</h2>
            <p class="card__meta">v${escapeHtml(article.version)} · ${escapeHtml(metaTags)}</p>
            <p class="card__body">${escapeHtml(buildExcerpt(article.content))}</p>
            <div class="card__footer">
                <span class="badge badge--tag">${escapeHtml(headerTag)}</span>
                <a class="btn btn--small btn--ghost"
                   href="article.html?slug=${hrefSlug}">Read →</a>
            </div>
        </article>
    `;
};

const renderError = (grid, message) => {
    grid.innerHTML = `
        <div class="alert alert--danger" role="alert">
            <span class="alert__icon" aria-hidden="true">!</span>
            <div>
                <p class="alert__title">Couldn't load articles</p>
                <p class="alert__body">${escapeHtml(message)}
                    — is the backend running on http://localhost:8001?</p>
            </div>
        </div>
    `;
};

export const initHome = async () => {
    if (!isLocalEnvironment()) return;
    const grid = document.querySelector('[data-articles-grid]');
    if (!grid) return;
    grid.setAttribute('aria-busy', 'true');
    try {
        const articles = await apiGet('/articles');
        if (!Array.isArray(articles) || articles.length === 0) {
            grid.innerHTML = '<p class="page-home__empty">No articles yet. Seed the database first.</p>';
            return;
        }
        grid.innerHTML = articles.map(renderCard).join('');
    } catch (error) {
        renderError(grid, error.message || 'Network error');
    } finally {
        grid.removeAttribute('aria-busy');
    }
};
```

---

## Step 8 — `js/article-detail.js` (article reader)

```js
import { apiGet, isLocalEnvironment } from './api.js';
import { escapeHtml, formatDate, splitParagraphs } from './dom.js';

const renderTags = (article) => (article.tags ?? [])
    .map((tag) => `<span class="badge badge--tag">${escapeHtml(tag.slug)}</span>`)
    .join(' ');

const renderBody = (article) => splitParagraphs(article.content)
    .map((para) => `<p>${escapeHtml(para)}</p>`)
    .join('');

const writeIntoPage = (article) => {
    const titleEl = document.querySelector('[data-article-title]');
    const metaEl = document.querySelector('[data-article-meta]');
    const bodyEl = document.querySelector('[data-article-body]');
    const tagsEl = document.querySelector('[data-article-tags]');
    const breadcrumbEl = document.querySelector('[data-article-breadcrumb]');
    const editLink = document.querySelector('[data-article-edit]');
    const updated = formatDate(article.updated_at);
    if (titleEl) titleEl.textContent = article.title;
    if (metaEl) metaEl.textContent = `Version ${article.version} · Updated ${updated}`;
    if (bodyEl) bodyEl.innerHTML = renderBody(article);
    if (tagsEl) tagsEl.innerHTML = renderTags(article);
    if (breadcrumbEl) breadcrumbEl.textContent = article.title;
    if (editLink) {
        editLink.href = `article-editor.html?slug=${encodeURIComponent(article.slug)}`;
    }
    document.title = `Stones & Scents — ${article.title}`;
};

const renderError = (host, message) => {
    if (!host) return;
    host.innerHTML = `
        <div class="alert alert--danger" role="alert">
            <span class="alert__icon" aria-hidden="true">!</span>
            <div>
                <p class="alert__title">Couldn't load this article</p>
                <p class="alert__body">${escapeHtml(message)}</p>
            </div>
        </div>
    `;
};

export const initArticle = async () => {
    if (!isLocalEnvironment()) return;
    const host = document.querySelector('[data-article-body]');
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug') || 'rose-quartz';
    try {
        const article = await apiGet(`/articles/${encodeURIComponent(slug)}`);
        writeIntoPage(article);
    } catch (error) {
        renderError(host, error.message || 'Network error');
    }
};
```

---

## Step 9 — `js/login.js`

```js
import { apiPost } from './api.js';
import { setSession } from './auth.js';

const showError = (host, message) => {
    if (!host) return;
    host.hidden = false;
    host.textContent = message;
};

const hideError = (host) => {
    if (!host) return;
    host.hidden = true;
    host.textContent = '';
};

export const initLogin = () => {
    const form = document.querySelector('[data-login-form]');
    const errorHost = document.querySelector('[data-login-error]');
    const submitButton = form?.querySelector('button[type="submit"]');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideError(errorHost);
        const data = new FormData(form);
        const username = String(data.get('username') ?? '').trim();
        const password = String(data.get('password') ?? '');
        if (!username || !password) {
            showError(errorHost, 'Both fields are required.');
            return;
        }
        if (submitButton) submitButton.disabled = true;
        try {
            const response = await apiPost('/auth/login', { username, password });
            setSession({
                token: response.access_token,
                username,
                role: response.role ?? 'regular',
            });
            window.location.href = 'index.html';
        } catch (error) {
            const message = error.status === 401
                ? 'Invalid username or password.'
                : (error.message || 'Login failed. Is the backend running?');
            showError(errorHost, message);
            if (submitButton) submitButton.disabled = false;
        }
    });
};
```

---

## Step 10 — `js/users-list.js`

```js
import { apiGet, isLocalEnvironment } from './api.js';
import { authHeader, getToken } from './auth.js';
import { escapeHtml, formatDate } from './dom.js';

const renderRow = (user) => {
    const initial = user.username.charAt(0).toUpperCase();
    const role = escapeHtml(user.role);
    return `
        <tr>
            <td data-label="Username">
                <span class="user-table__cell--name">
                    <span class="user-table__avatar user-table__avatar--${role}"
                          aria-hidden="true">${escapeHtml(initial)}</span>
                    ${escapeHtml(user.username)}
                </span>
            </td>
            <td data-label="Role">
                <span class="badge badge--role-${role}">${role}</span>
            </td>
            <td data-label="Joined">${escapeHtml(formatDate(user.created_at))}</td>
            <td data-label="Actions">
                <div class="user-table__actions">
                    <a class="btn btn--ghost btn--small"
                       href="user-detail.html?id=${encodeURIComponent(user.id)}">View</a>
                    <a class="btn btn--secondary btn--small"
                       href="user-edit.html?id=${encodeURIComponent(user.id)}">Edit</a>
                </div>
            </td>
        </tr>
    `;
};

const renderUnauthorised = (alertHost) => {
    if (!alertHost) return;
    alertHost.hidden = false;
    alertHost.className = 'alert alert--info';
    alertHost.innerHTML = `
        <span class="alert__icon" aria-hidden="true">i</span>
        <div>
            <p class="alert__title">Log in as admin to see users</p>
            <p class="alert__body">The user listing is admin-only. Use admin / admin123 on the login page.</p>
        </div>
    `;
};

const renderError = (alertHost, message) => {
    if (!alertHost) return;
    alertHost.hidden = false;
    alertHost.className = 'alert alert--danger';
    alertHost.innerHTML = `
        <span class="alert__icon" aria-hidden="true">!</span>
        <div>
            <p class="alert__title">Couldn't load users</p>
            <p class="alert__body">${escapeHtml(message)}</p>
        </div>
    `;
};

export const initUsers = async () => {
    if (!isLocalEnvironment()) return;
    const tbody = document.querySelector('[data-users-tbody]');
    const alertHost = document.querySelector('[data-users-alert]');
    if (!getToken()) {
        renderUnauthorised(alertHost);
        if (tbody) tbody.innerHTML = '';
        return;
    }
    try {
        const users = await apiGet('/users', authHeader());
        if (tbody) tbody.innerHTML = users.map(renderRow).join('');
    } catch (error) {
        const message = error.status === 403
            ? 'Your account is not an admin — log out and back in as admin.'
            : (error.message || 'Network error');
        renderError(alertHost, message);
        if (tbody) tbody.innerHTML = '';
    }
};
```

---

## Step 11 — `js/main.js` (the entry point)

```js
import { initNav } from './nav.js';

const PAGE_LOADERS = {
    home: () => import('./articles-list.js').then((mod) => mod.initHome()),
    article: () => import('./article-detail.js').then((mod) => mod.initArticle()),
    login: () => import('./login.js').then((mod) => mod.initLogin()),
    users: () => import('./users-list.js').then((mod) => mod.initUsers()),
};

const run = async () => {
    await initNav();
    const page = document.body.dataset.page;
    const loader = PAGE_LOADERS[page];
    if (loader) await loader();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { run(); });
} else {
    run();
}
```

`main.js` is the only `<script>` reference each HTML file needs. Per-page modules are loaded via dynamic `import()` so unused modules don't ship.

---

## Step 12 — Wire the four HTML pages

For each page below, you'll do **three** things:

1. Add a `data-page="…"` attribute to the `<body>` tag.
2. Replace mock content with empty containers carrying `data-…` hooks the JS targets.
3. Add `<script type="module" src="js/main.js"></script>` immediately before `</body>`.

The JS gracefully no-ops on the live GitHub Pages site (where `window.location.hostname` is `kpchknst.github.io`), so the static fallback content stays put. To keep that fallback usable, **don't delete the mock cards / paragraphs from Lab 1** — just leave them inside the data-hook container; once the JS runs successfully it overwrites the container's `innerHTML`.

Detailed edits for each of the four pages live in the implementation. The summary:

| File | `data-page` | Hooks added |
|---|---|---|
| `index.html` | `home` | `data-articles-grid` on the `.page-home__grid` section |
| `article.html` | `article` | `data-article-title`, `data-article-meta`, `data-article-body`, `data-article-tags`, `data-article-breadcrumb`, `data-article-edit` |
| `login.html` | `login` | `data-login-form` on `<form>`, `data-login-error` on a hidden `<p>` near the form |
| `users.html` | `users` | `data-users-tbody` on `<tbody>`, `data-users-alert` on the success-alert host (re-used for errors) |

Every page also gets two nav hooks (so the top-bar log-out / role badge works site-wide):

- `data-nav-user` on a `<span>` placed before the "Log in" button (initially `hidden`)
- `data-nav-login` on the existing "Log in" button

---

## Step 13 — Run the lint

```bash
cd frontend
npm run lint
```

Expected output: nothing (zero errors, zero warnings, exit 0). If you see complaints:

| Lint complaint | Fix |
|---|---|
| `'…' is defined but never used` | Remove the import or the variable |
| `Expected indentation of 4 spaces but found 2` | Reformat the file |
| `Expected linebreaks to be 'LF' but found 'CRLF'` | Should be off; double-check `.eslintrc.json` |
| `Unexpected console statement` | Replace with UI-rendered error (or delete) |
| `Unable to resolve path to module './x.js'` | Ensure the file exists and the import has `.js` extension |

---

## Step 14 — Run end-to-end smoke test

```bash
# Terminal A — backend (teacher's machine: spec ports)
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8001

# Terminal B — frontend file server (teacher's machine: spec ports)
cd frontend/pages
python3 -m http.server 8000
```

> **Anastasia's Mac:** ports 8000 and 8001 are held by an unrelated Docker stack, so use `:8002` for the backend and `:5500` for the frontend instead, and let CORS know:
>
> ```bash
> # Terminal A
> cd backend && source .venv/bin/activate
> CORS_ORIGINS="http://localhost:5500,http://localhost:8000" \
>     uvicorn app.main:app --reload --port 8002
>
> # Terminal B
> cd frontend/pages && python3 -m http.server 5500
> ```
>
> Then in the browser DevTools console run ONCE:
>
> ```js
> localStorage.setItem('apiBase', 'http://localhost:8002')
> ```
>
> Reload. `api.js` reads `localStorage.apiBase` before the spec default (`http://localhost:8001`), so the JS now talks to the alternate backend. The override only persists for the origin you set it on — `localStorage.removeItem('apiBase')` clears it.

Open http://localhost:8000/index.html (or `:5500` on Anastasia's mac) in **Chrome** AND **Firefox**. For each browser:

1. **Homepage** — open DevTools Network tab. Reload. You should see exactly one `GET /articles` request returning 200 with a JSON array of 10 stones. The 10 cards on screen show the real titles, real version numbers, real tag slugs.
2. **Console tab** — empty.
3. Click any card's "Read →". URL becomes `article.html?slug=...`. The article title, meta, paragraphs, and tag chips all come from the API.
4. Navigate to `login.html`. Submit `regular` / `regular123`. You're redirected to home; the top nav shows the role badge + "Log out".
5. Navigate to `login.html` again. Submit `wrong` / `wrong`. Inline error appears: "Invalid username or password." No console errors.
6. Log in as admin / admin123. Navigate to `users.html`. The table shows real users with admin/regular badges.
7. Click "Log out". Token cleared, nav reverts.

**Performance check** (spec: < 4 s):

In DevTools → Performance / Network panel, reload `index.html` with cache disabled. Note the `DOMContentLoaded` time and the time the last article fetch finishes. Both should be under 4 s on a local machine.

Document the actual numbers in `docs/lab2-report.md`.

---

## Step 15 — Update the report

Open `docs/lab2-report.md` and fill in:

- The lint command's output (paste the empty success line).
- The actual DOMContentLoaded / `GET /articles` timings from DevTools.
- The Chrome version + Firefox version you tested in.
- A screenshot of the homepage with real fetched data + DevTools open showing the `200 OK` for `/articles`.
- A screenshot of `login.html` after a failed login attempt (showing the inline error).

---

## Step 16 — Commit, push, merge

```bash
cd /Users/mac/uni/2_kurs/ВТіВД/web
git status                                # review
git add LAB2.md docs/lab2-guide.md docs/lab2-report.md \
        frontend/.eslintrc.json frontend/.eslintignore \
        frontend/package.json frontend/package-lock.json \
        frontend/pages/js \
        frontend/pages/index.html frontend/pages/article.html \
        frontend/pages/login.html frontend/pages/users.html
git commit -m "lab2: AJAX wiring with vanilla fetch + ESLint Airbnb config"
git push -u origin lab2
```

Then:

1. **PR `lab2` → `development`** — merge with **merge commit** (NOT squash), per spec.
2. **PR `development` → `main`** — merge with merge commit.

> Per spec: lab branches are never deleted. `lab2` stays alive after merge.

---

## Step 17 — Final checks before moving on

- [ ] `npm run lint` exits 0 with no output (zero errors, zero warnings)
- [ ] `frontend/package.json` lists eslint, eslint-config-airbnb-base, eslint-plugin-import as devDeps
- [ ] `frontend/.eslintrc.json` extends airbnb-base, indent 4, linebreak-style off
- [ ] `frontend/pages/js/` exists with eight JS modules
- [ ] At least 3 endpoints exercised (we exercise 5: GET /articles, GET /articles/:slug, POST /auth/login, GET /auth/me, GET /users)
- [ ] Homepage replaces 10 mock cards with real data when backend is running
- [ ] Article reader pulls article from `GET /articles/:slug`
- [ ] Login form successfully gets a JWT, stores it in localStorage, redirects
- [ ] Browser console has zero errors and zero logs after a full happy-path walk-through
- [ ] DOMContentLoaded < 4 s in Chrome and Firefox
- [ ] Tested in Chrome + Firefox at desktop and mobile widths
- [ ] No commented-out code anywhere under `frontend/pages/js/`
- [ ] All data sent and received is JSON
- [ ] `gh auth status` shows `kpchknst` before push
- [ ] PR `lab2 → development` merged with merge-commit
- [ ] PR `development → main` merged with merge-commit
- [ ] `docs/lab2-report.md` filled in with real numbers + screenshots

When all sixteen boxes are ticked, Lab 2 is done.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Browser console shows `CORS error` on the fetch | Backend's CORS allow-list does not include the origin you served from. The default lets `http://localhost:8000` through; if you served from a different port, set `CORS_ORIGINS=http://localhost:5500` (or whatever) in `backend/.env` and restart uvicorn |
| `npm run lint` reports `Parsing error: 'import' and 'export' may appear only with 'sourceType: module'` | `.eslintrc.json` is missing or `parserOptions.sourceType` is not `module` |
| Homepage shows the mock cards even when the backend is up | The fetch failed silently. Open DevTools Console — there will be a network error if the URL is wrong. Verify `API_BASE` in `js/api.js` matches the port uvicorn is on |
| `eslint **/*.js` matches no files in CI but works locally | bash with `globstar` off doesn't expand `**`. The npm script's quoting (`"**/*.js"`) hands the glob to ESLint itself, which expands it correctly. Don't unquote the glob |
| `import './api.js'` errors with `Failed to load module script: Expected a JavaScript MIME type` | The static file server isn't sending `application/javascript`. `python3 -m http.server` does it correctly; some lightweight servers don't |
| Login succeeds but the badge doesn't appear in nav | `nav.js` reads `data-nav-user`. Check that the HTML has `<span data-nav-user hidden>...</span>` near the "Log in" link |
| Users page is blank even logged in as admin | The role on the JWT was `regular`. Check `auth/me` returned `role: "admin"`. If not, you logged in with the wrong account |
