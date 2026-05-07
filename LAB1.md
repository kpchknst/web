# LAB 1 — Static layout, SCSS, GitHub Pages, AI assets (quick start)

> **Branch:** `lab1` · **Points:** 10 (3 site + 5 ChatGPT-experience writeup + 2 AI graphics)
> **Full guide:** [`docs/lab1-guide.md`](docs/lab1-guide.md) · **Report:** [`docs/lab1-report.md`](docs/lab1-report.md)

## What's in this lab

A static **HTML5 + SCSS** mock-up of all 11 screens of the *Stones & Scents Encyclopedia*. **No JavaScript** runs in the page — every screen is a hand-written HTML file, styled by SCSS that compiles to a single `main.css`. The site is hosted on **GitHub Pages** at:

> **https://kpchknst.github.io/web/**

The 11 screens cover both Lab 1's mandatory user-management section and Variant 5's article + moderation flows.

## One-time setup

```bash
# from the repo root
cd frontend
npm install              # installs Dart Sass (the only dependency)
npm run scss             # compiles styles/main.scss → styles/dist/main.css
```

## Run locally

Because every page is plain HTML you have two equivalent options:

```bash
# Option A — open one file directly in the browser
open frontend/pages/index.html       # macOS
xdg-open frontend/pages/index.html   # Linux

# Option B — serve the folder so absolute paths work everywhere
cd frontend/pages
python3 -m http.server 5500          # then open http://localhost:5500
```

> **Watching SCSS while you edit:** `npm run scss:watch` rebuilds `main.css` on every save.

## Demo credentials

There aren't any — Lab 1 has no JavaScript and no real auth, so the login page is purely visual. Real authentication arrives in Lab 3 once the React SPA replaces these mock-ups.

## Known limits (deliberate, per spec)

- **No JS at all** — no `<script>` tags, no event handlers, no API calls.
- **All article text is hard-coded into the HTML** as placeholder mock-up content (it deliberately mirrors the seeded articles in the backend's `app/seed.py`, so the layout matches Lab 2's real fetched data).
- **Modals don't open** — the create-user dialog, delete-confirm dialog, and edit-conflict warning are rendered as static screens so the layout can be seen and reviewed. They become interactive in Lab 3.

## How to verify the SCSS toolchain

The teacher will ask to see SCSS compile. Run:

```bash
cd frontend
npm run scss
```

It writes a fresh `frontend/styles/dist/main.css`. The `frontend/styles/main.scss` file imports every partial under `frontend/styles/` (variables, mixins, components, pages).

## Where to find what

```
frontend/
├── pages/                    # 11 HTML files — one per screen
│   ├── index.html            # / (article listing — homepage)
│   ├── login.html            # /login
│   ├── users.html            # /users (admin sees all; regular sees self)
│   ├── user-detail.html      # /users/:id
│   ├── user-edit.html        # /users/:id/edit
│   ├── user-create.html      # /users/new (modal mock)
│   ├── article.html          # /articles/:slug
│   ├── article-editor.html   # /articles/new and /articles/:slug/edit
│   ├── moderation.html       # /moderation
│   ├── profile.html          # /profile
│   └── error-states.html     # showcase of validation + error notifications
├── styles/
│   ├── _variables.scss       # ALL colours live here (per spec rule)
│   ├── _mixins.scss          # ≥ 1 mixin (responsive breakpoint helper)
│   ├── _reset.scss
│   ├── _typography.scss
│   ├── components/           # button, form, modal, nav, alert partials
│   ├── pages/                # per-page partials
│   ├── main.scss             # imports everything
│   └── dist/main.css         # compiled output (committed for GH Pages)
├── assets/
│   └── stones/               # ≥ 5 AI-generated stone illustrations
└── package.json              # `npm run scss`, `npm run scss:watch`
```

For the *why* behind the structure, see [`docs/architecture.md`](docs/architecture.md) and the [design doc](docs/plans/2026-05-06-stones-encyclopedia-design.md).
