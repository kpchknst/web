# Lab 1 — Static layout — step-by-step guide

> Audience: **you** (Anastasia). This is the build script. Each step is one folder, one file, or one command.
>
> **Points:** 10 total = 3 (working static site) + 5 (ChatGPT-experience writeup) + 2 (≥ 5 AI-generated graphics).
>
> **Time estimate:** ~6–8 hours spread over 2–3 sittings (most of it is page mark-up and screenshots).

---

## What you'll deliver

1. **11 static HTML pages** (`frontend/pages/*.html`) — no JavaScript at all.
2. **SCSS source** in `frontend/styles/` with a separate colour-variables file, ≥ 1 mixin, nesting capped at 2 levels.
3. **A built `main.css`** (`frontend/styles/dist/main.css`) committed for GitHub Pages.
4. **≥ 5 AI-generated stone illustrations** in `frontend/assets/stones/`, credited in `docs/lab1-report.md`.
5. **A live site at `https://kpchknst.github.io/web/`** auto-deployed via GitHub Actions.
6. **A ChatGPT-experience writeup** (graded — 5 of 10 pts) in `docs/lab1-report.md` describing the prompts you used, what you kept vs. discarded, and time saved.
7. **A merge request** `lab1` → `development`, then `development` → `main`.

---

## Pre-flight checklist

```bash
cd /Users/mac/uni/2_kurs/ВТіВД/web
gh auth status                      # active account must be kpchknst
git status                          # working tree should be clean
git checkout development            # start from the integration branch
git pull origin development         # make sure local is up to date
git checkout -b lab1                # create the lab branch (already done if you see this guide there)
git status                          # should show "On branch lab1"
node --version                      # any recent Node ≥ 18 (Dart Sass needs it)
npm --version
```

> ⚠️ If `gh auth status` shows `a-kupchak` as active, **stop** and run `gh auth switch -u kpchknst` before you push anything.

---

## Step 1 — Set up the SCSS toolchain

```bash
cd frontend
```

### 1a. `frontend/package.json`

```json
{
  "name": "stones-and-scents-frontend",
  "version": "0.1.0",
  "private": true,
  "description": "Static layout for the Stones & Scents Encyclopedia (Lab 1).",
  "scripts": {
    "scss": "sass --no-source-map --style=compressed styles/main.scss styles/dist/main.css",
    "scss:watch": "sass --watch styles/main.scss:styles/dist/main.css"
  },
  "devDependencies": {
    "sass": "^1.79.0"
  }
}
```

### 1b. Install

```bash
npm install
```

That puts Dart Sass in `node_modules/`. The folder is git-ignored.

### 1c. Verify

```bash
npm run scss
```

Should print one line and exit 0 (until we have content, the output `main.css` will be empty — that's fine for now).

> **Show this to the teacher when they ask "how does SCSS compile to CSS?"** Run `npm run scss:watch`, edit `_variables.scss`, save, and the teacher sees `main.css` regenerate automatically.

---

## Step 2 — Folder structure

Create everything under `frontend/`:

```bash
mkdir -p styles/components styles/pages styles/dist
mkdir -p pages assets/stones assets/icons
```

Final tree (you'll fill the files in the next steps):

```
frontend/
├── package.json
├── pages/
├── styles/
│   ├── _variables.scss
│   ├── _mixins.scss
│   ├── _reset.scss
│   ├── _typography.scss
│   ├── components/
│   │   ├── _buttons.scss
│   │   ├── _forms.scss
│   │   ├── _modals.scss
│   │   ├── _navigation.scss
│   │   └── _alerts.scss
│   ├── pages/
│   │   ├── _login.scss
│   │   ├── _users.scss
│   │   ├── _articles.scss
│   │   ├── _moderation.scss
│   │   └── _profile.scss
│   ├── main.scss
│   └── dist/main.css
└── assets/
    ├── stones/        # AI-generated images
    └── icons/         # any UI icons
```

---

## Step 3 — Colour variables (`styles/_variables.scss`)

The spec says: *"Use variables for all colors. Create separate style file with all of color variables."*

Pick a stone-inspired palette. A working starting point:

```scss
// _variables.scss — single source of truth for every colour in the site.

// Brand — pulled from the seven stones we feature most often
$rose-quartz:        #f6c8d2;
$amethyst:           #6a3aa6;
$citrine:            #f2c75c;
$aventurine:         #6ea58a;
$lapis-lazuli:       #1d3a8a;
$tiger-eye:          #b07a3a;
$carnelian:          #c44e3e;

// Surfaces
$bg-page:            #faf7f2;     // warm off-white, like polished selenite
$bg-surface:         #ffffff;
$bg-elevated:        #fbfafd;
$border-subtle:      #e2dde6;
$border-strong:      #c8c0d0;

// Text
$text-primary:       #2c1f33;
$text-secondary:     #6b6373;
$text-inverse:       #ffffff;

// Semantic
$color-primary:      $amethyst;
$color-primary-fg:   $text-inverse;
$color-success:      $aventurine;
$color-warning:      $citrine;
$color-danger:       $carnelian;

// Typography
$font-sans:          "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
$font-serif:         "Cormorant Garamond", Georgia, serif;

// Spacing scale (use multiples of 0.25rem)
$space-xs:           0.25rem;
$space-sm:           0.5rem;
$space-md:           1rem;
$space-lg:           1.5rem;
$space-xl:           2.5rem;

// Breakpoints
$bp-sm:              480px;
$bp-md:              768px;
$bp-lg:              1024px;
$bp-xl:              1280px;

// Effects
$radius-sm:          4px;
$radius-md:          8px;
$radius-lg:          16px;
$shadow-soft:        0 2px 8px rgba(44, 31, 51, 0.08);
$shadow-strong:      0 8px 24px rgba(44, 31, 51, 0.16);
$transition-base:    180ms ease-out;
```

Tweak the palette to taste — the **only rule** is that every colour used in components/pages must come through a variable defined here, never a raw hex literal.

---

## Step 4 — Mixins (`styles/_mixins.scss`)

Spec requires *"at least one mixin"*. We'll write three useful ones.

```scss
@use "variables" as v;

// 1. Responsive breakpoint helper. Usage: @include respond-to(md) { ... }
@mixin respond-to($breakpoint) {
  @if $breakpoint == sm {
    @media (min-width: v.$bp-sm) { @content; }
  } @else if $breakpoint == md {
    @media (min-width: v.$bp-md) { @content; }
  } @else if $breakpoint == lg {
    @media (min-width: v.$bp-lg) { @content; }
  } @else if $breakpoint == xl {
    @media (min-width: v.$bp-xl) { @content; }
  } @else {
    @error "Unknown breakpoint: #{$breakpoint}";
  }
}

// 2. Card surface — used on article tiles, user rows, edit-queue items.
@mixin card-surface {
  background: v.$bg-surface;
  border: 1px solid v.$border-subtle;
  border-radius: v.$radius-md;
  box-shadow: v.$shadow-soft;
  padding: v.$space-md;
  transition: box-shadow v.$transition-base, transform v.$transition-base;
}

// 3. Single-line ellipsis for headings & nav items.
@mixin truncate {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
```

---

## Step 5 — Reset, typography, base layout

### 5a. `styles/_reset.scss`

```scss
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { min-height: 100vh; }
img { max-width: 100%; display: block; }
button { font: inherit; }
a { color: inherit; }
```

### 5b. `styles/_typography.scss`

```scss
@use "variables" as v;

body {
  font-family: v.$font-sans;
  font-size: 16px;
  line-height: 1.55;
  color: v.$text-primary;
  background: v.$bg-page;
}

h1, h2, h3, h4 { font-family: v.$font-serif; font-weight: 600; line-height: 1.2; }

h1 { font-size: 2rem; }
h2 { font-size: 1.5rem; }
h3 { font-size: 1.25rem; }

a { text-decoration: none; transition: color v.$transition-base; }
a:hover, a:focus { color: v.$color-primary; }
```

---

## Step 6 — Component partials

Five component files under `styles/components/`. Each is small (≤ 60 lines) and focuses on one concern. Below is a sketch — flesh out the visual details to taste.

### 6a. `_buttons.scss`

```scss
@use "../variables" as v;
@use "../mixins" as m;

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: v.$space-sm;
  padding: v.$space-sm v.$space-md;
  border: 1px solid transparent;
  border-radius: v.$radius-sm;
  font-weight: 500;
  cursor: pointer;
  transition: background v.$transition-base, color v.$transition-base, border-color v.$transition-base;
}

.btn--primary {
  background: v.$color-primary;
  color: v.$color-primary-fg;
}
.btn--primary:hover { background: darken(v.$color-primary, 6%); }

.btn--secondary {
  background: transparent;
  color: v.$color-primary;
  border-color: v.$border-strong;
}
.btn--secondary:hover { background: v.$bg-elevated; }

.btn--danger {
  background: v.$color-danger;
  color: v.$text-inverse;
}

.btn--block { width: 100%; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
```

### 6b. `_forms.scss`

Form fields, labels, inline errors. Honour: hyphen class names (`form-field`, `form-error`), no underscores, no global selectors.

### 6c. `_modals.scss`

The dialogs: create-user modal, delete-confirm modal, edit-conflict warning. Even though Lab 1 has no JS to open/close them, render them as visible static blocks on dedicated pages so the teacher can see the layout.

### 6d. `_navigation.scss`

Top nav: logo, links, role badge, login/logout pseudo-button.

### 6e. `_alerts.scss`

Inline alerts for **error notifications** and **validation errors** (both spec-mandatory). Variants: `.alert--info`, `.alert--success`, `.alert--warning`, `.alert--danger`.

---

## Step 7 — Page partials

One per major screen group, under `styles/pages/`:

- `_login.scss` — centered card layout, form, "Don't have an account?" link
- `_users.scss` — table layout for the user listing, role-badge styles
- `_articles.scss` — homepage grid of stone tiles + article-reader column layout + the editor with the visible 2000-char counter
- `_moderation.scss` — admin queue with a side-by-side diff layout (CSS-only — flex two columns, highlight added/removed text by class, no JS)
- `_profile.scss` — user's own edits with status badges (pending / approved / rejected / stale)

Each page partial is small (≤ 100 lines). Use `@include respond-to(md)` for the breakpoint changes.

---

## Step 8 — `styles/main.scss`

The single entry point. Imports run in this order — variables and mixins **before** anything that uses them.

```scss
// Order matters: foundations first, components second, pages last.
@use "variables";
@use "mixins";
@use "reset";
@use "typography";

@use "components/buttons";
@use "components/forms";
@use "components/modals";
@use "components/navigation";
@use "components/alerts";

@use "pages/login";
@use "pages/users";
@use "pages/articles";
@use "pages/moderation";
@use "pages/profile";
```

Build:

```bash
cd frontend
npm run scss
ls -la styles/dist/main.css       # should now be ~10–30 KB
```

---

## Step 9 — The 11 HTML pages

Each page lives in `frontend/pages/`. They share a common skeleton:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Stones &amp; Scents — <Page Name></title>
  <link rel="stylesheet" href="../styles/dist/main.css">
</head>
<body>
  <!-- Top navigation, repeated on every page -->
  <header class="site-header">
    <a class="site-header__logo" href="index.html">Stones &amp; Scents</a>
    <nav class="site-nav">
      <a href="index.html">Home</a>
      <a href="users.html">Users</a>
      <a href="moderation.html">Moderation</a>
      <a href="profile.html">My profile</a>
      <a class="btn btn--secondary" href="login.html">Log in</a>
    </nav>
  </header>

  <main class="page-<page-slug>">
    <!-- page-specific content here -->
  </main>

  <footer class="site-footer">
    <small>Stones &amp; Scents Encyclopedia · Lab 1 · <a href="https://github.com/kpchknst/web">source</a></small>
  </footer>
</body>
</html>
```

### Page checklist (one section per file)

| File | Route it represents | Mandatory elements |
|---|---|---|
| `index.html` | `/` (homepage / article list) | Hero text, search input (visual only), tag filter chips, grid of 10 stone cards (use the seeded titles + first ~140 chars of each article — copy from `backend/app/seed.py`) |
| `login.html` | `/login` | Centered card, username + password fields, submit button, "register" link, validation-error example shown statically |
| `users.html` | `/users` | Table with: avatar/initials, username, role badge (admin/regular), created-at, action icons (view/edit/delete). Include the "+ New user" button |
| `user-detail.html` | `/users/:id` | Profile card: username, role, joined date, recent edits placeholder |
| `user-edit.html` | `/users/:id/edit` | Same as create-user form but with values pre-filled |
| `user-create.html` | `/users/new` | The create-user dialog as a full page (Username, Password, **Confirm password** — spec-mandatory, Role select, OK + Cancel) |
| `article.html` | `/articles/:slug` | One article, title, hero image, body, "Propose edit" button, tag chips |
| `article-editor.html` | `/articles/new` and `/articles/:slug/edit` | Title, content textarea with the **2000-char counter visible**, cover-image URL field, tag selector, edit-conflict yellow banner shown statically |
| `moderation.html` | `/moderation` | List of pending edits, side-by-side diff layout for one expanded item |
| `profile.html` | `/profile` | Logged-in user's own edits with status badges (pending / approved / rejected / stale — show all 4 states statically) |
| `error-states.html` | (showcase) | One page that renders every alert variant + every form validation error so the teacher can see them all without clicking |

> The "delete user" confirmation is a modal — render it inside `users.html` as a visible static block under the user row, OR on its own showcase page. Spec just requires that it exists visually.

### Mock-data tip

When you copy article excerpts into the cards on `index.html` and the body of `article.html`, use the **same titles and first paragraph** as `backend/app/seed.py`. That way when Lab 2 starts hitting the API, the layout doesn't change visually — only the data source does.

---

## Step 10 — Validate the HTML

Run every page through [validator.w3.org](https://validator.w3.org/) (the spec links it directly).

Quick batch trick — paste each page's HTML in turn, fix issues until "No errors or warnings to show". Common things the validator flags:

- Missing `alt` on `<img>` (always include — even `alt=""` is allowed for decorative images).
- Stray inline `style="…"` (the spec forbids inline styles — move it to SCSS).
- `<button>` outside a form without `type="button"` (default is `type="submit"`).
- Wrong nesting (`<p>` inside `<p>`, block elements inside `<a>` in legacy HTML — but HTML5 allows it).

Document the green "valid" results in `docs/lab1-report.md`.

---

## Step 11 — AI-generated stone illustrations (worth 2 of 10 pts)

You need **at least 5** AI-generated images of stones. They go in `frontend/assets/stones/` and are referenced from `index.html`, `article.html`, etc. Credit each one in `docs/lab1-report.md`.

### Tools you can use (any one is fine)

- **Bing Image Creator** (free, DALL-E 3) — https://www.bing.com/create
- **DALL-E** (via ChatGPT Plus or API)
- **Midjourney** (paid)
- **Stable Diffusion** locally (free if you have a GPU)

### Prompt template that works well

> *Photorealistic close-up of a single polished {stone-name} crystal on a soft cream linen surface, natural daylight from the left, very shallow depth of field, neutral background, 1:1 aspect ratio, professional product photography, no text or watermark.*

Replace `{stone-name}` with: rose quartz, aventurine, amethyst, citrine, black tourmaline, lapis lazuli, moonstone, tiger's eye, selenite, carnelian.

### Save them as

```
frontend/assets/stones/rose-quartz.jpg
frontend/assets/stones/amethyst.jpg
frontend/assets/stones/citrine.jpg
frontend/assets/stones/lapis-lazuli.jpg
frontend/assets/stones/aventurine.jpg
# ... at least 5 of these
```

Aim for ~800×800 px JPEGs, 80 % quality. **Compress them** before committing — `jpegoptim --max=85 frontend/assets/stones/*.jpg` keeps the repo small.

### Document each one in the report

In `docs/lab1-report.md`, fill in the **AI assets table**: filename, tool used, exact prompt, why you kept this one over alternatives.

---

## Step 12 — Deploy to GitHub Pages (via GitHub Actions)

The original spec says *"Find GitHub Pages under Settings, select the master branch, and click save."* That worked in 2020 when the repo was a single static folder; ours is a monorepo with `frontend/`, `backend/`, and `docs/` side-by-side, so we use a tiny GitHub Actions workflow that publishes the built `frontend/` to GitHub Pages on every push.

### 12a. Create `.github/workflows/pages.yml`

```yaml
name: Deploy frontend to GitHub Pages

on:
  push:
    branches: [lab1, main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Sass and build
        working-directory: frontend
        run: |
          npm ci
          npm run scss

      - name: Stage site
        run: |
          mkdir -p _site
          cp -r frontend/pages/. _site/
          mkdir -p _site/styles
          cp frontend/styles/dist/main.css _site/styles/main.css
          if [ -d frontend/assets ]; then cp -r frontend/assets _site/assets; fi
          # GH Pages serves /index.html at /; pages/index.html is already at the root after the cp above.

      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site

      - id: deployment
        uses: actions/deploy-pages@v4
```

### 12b. Adjust `<link>` paths in your HTML

Inside the workflow, the layout becomes:

```
_site/
├── index.html
├── login.html
├── …
├── styles/main.css
└── assets/stones/…
```

So in your HTML, the stylesheet href that worked locally (`../styles/dist/main.css`) needs to become `styles/main.css` once published.

The cleanest fix: use a relative path that works in both layouts. Change every page's `<link>` to:

```html
<link rel="stylesheet" href="../styles/dist/main.css">
```

…and add a tiny build step in the Action that *also* leaves `styles/dist/main.css` available at `_site/styles/dist/main.css`. Update the "Stage site" step to:

```yaml
mkdir -p _site/styles/dist
cp frontend/styles/dist/main.css _site/styles/dist/main.css
```

That way the same HTML works locally (open the file directly) and on GH Pages (relative path resolves to `_site/styles/dist/main.css`).

### 12c. Configure the Pages source

1. Push this branch (`lab1`) once — the workflow will fail the first time because Pages isn't enabled yet.
2. On GitHub: **Settings → Pages → Source → "GitHub Actions"**.
3. Re-run the failed action (Actions tab → click the failed run → "Re-run jobs").
4. After ~1 minute the URL appears: **https://kpchknst.github.io/web/**.

### 12d. Add a tiny `frontend/pages/.nojekyll`

```bash
touch frontend/pages/.nojekyll
```

Empty file — tells GH Pages not to run Jekyll (which would silently strip `_*` folder names).

---

## Step 13 — Cross-browser test

Open the deployed URL in **Chrome** AND **Firefox**:

- All 11 pages render without horizontal scroll on a 320 px-wide viewport (mobile)
- All 11 pages render without horizontal scroll on a 1440 px-wide viewport (desktop)
- Hover/focus states fire on links and buttons
- No console errors
- No 404s in the network tab (every CSS, image, font request 200s)

Document the test results in `docs/lab1-report.md` (table of pages × browsers × viewports = green ✅ checks).

---

## Step 14 — Write the ChatGPT-experience writeup (5 of 10 pts)

Open `docs/lab1-report.md` and fill in the section titled **"ChatGPT-experience writeup"** with **your own first-person reflection**:

- Which prompts you used to generate the stone illustrations (paste the prompts verbatim).
- Which prompts you used while writing the article copy (if any).
- What you kept vs. discarded — give specific examples (e.g. "AI's first version of the moonstone description used incorrect mineralogy; I rewrote the hardness paragraph by hand").
- A rough hours-saved estimate ("would have taken me ~4 h to write 10 articles by hand; with AI it took 90 min including fact-checking").
- Two or three lessons learned.

> ⚠️ **This section is graded.** A generic "I used ChatGPT" paragraph won't score the full 5 points. Be specific.

---

## Step 15 — Commit, push, merge request

```bash
cd /Users/mac/uni/2_kurs/ВТіВД/web
git status                          # review what you're about to commit
git add frontend .github docs/lab1-guide.md docs/lab1-report.md LAB1.md
git commit -m "lab1: static layout for all 11 screens, SCSS, GH Pages workflow"
git push -u origin lab1
```

Then open the merge request: `lab1` → `development` (use **merge commit**, NOT squash, to preserve history per spec). Wait for the GH Pages workflow to go green, click the live URL, and confirm everything renders. Once merged into development, re-run the workflow on `main` to publish from there too.

> Per the spec footer: *the lab branch is never deleted.* `lab1` stays alive after merge.

---

## Step 16 — Final checks before moving on

- [ ] All 11 pages exist in `frontend/pages/` and validate at validator.w3.org
- [ ] `npm run scss` produces a non-empty `frontend/styles/dist/main.css`
- [ ] `_variables.scss` contains every colour used in the site (no raw hex anywhere else)
- [ ] At least one mixin defined in `_mixins.scss` and used in ≥ 1 partial
- [ ] All SCSS nesting is at most 2 levels deep
- [ ] All class names use hyphens (no underscores or CamelCase)
- [ ] All `<img>` tags have meaningful `alt`
- [ ] `frontend/assets/stones/` contains ≥ 5 AI-generated images
- [ ] `docs/lab1-report.md` AI-assets table is filled in
- [ ] `docs/lab1-report.md` ChatGPT-experience writeup is filled in
- [ ] Site loads at `https://kpchknst.github.io/web/`
- [ ] Tested in Chrome and Firefox at mobile and desktop widths
- [ ] `gh auth status` shows `kpchknst` before push
- [ ] `git log --oneline lab1` shows ≥ 1 commit with a meaningful message

When all sixteen boxes are ticked, open the PR `lab1` → `development` and message me — I'll review, then we can move to **Lab 2**.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| GH Pages action fails: "Source is not configured" | Settings → Pages → Source → "GitHub Actions". Re-run. |
| Live site shows 404 | The workflow ran but `_site/index.html` wasn't created. Check the "Stage site" step in Actions logs. |
| Stylesheet not loading on the live site | Path mismatch. Open Network tab in DevTools, see what URL the page is requesting, adjust the `<link href>` so it works both locally and at `/web/styles/dist/main.css`. |
| `npm run scss` errors with "Module not found" | You're outside `frontend/`. `cd frontend` first. |
| Images committed are huge (slowing the repo) | `jpegoptim --max=80 frontend/assets/stones/*.jpg` |
| Validator complains about `&` in title | Replace bare `&` with `&amp;`. |
| Lab branch shows up as "ahead by 0" | You forgot to commit. `git status` to check. |
