# Lab 1 — Static layout — report

> **STATUS:** Draft — fill in the AI-assets table and the ChatGPT-experience writeup before merging to `development`. Re-run the validator and fill in the green-✅ rows in the cross-browser table after testing.
>
> Audience: **the teacher**. This file documents what was built, why, and how to demo it.
>
> **Branch:** `lab1` · **Points:** 10 (3 site + 5 ChatGPT-experience writeup + 2 AI graphics)

---

## What the spec asks for

From [`Lab_1.pdf`](../../Lab_1.pdf):

> *Student should create static pages for the future single page application. All planned sections should be covered. Layout should support response/adaptive design. In the next labs static pages will be converted to templates and will be used with chosen framework.*
>
> Required pages: Login, Logout, Users listing (Admin & Regular), Create-user dialog (Username, Password, Confirm password, Role, OK + Cancel), user detail, edit user, delete user, error notifications, validation errors, **and at least 3 variant-specific screens**.

The 2026 portal screenshots add two AI-related deliverables:
- ≥ 5 AI-generated stone illustrations — 2 pts
- A **ChatGPT-experience writeup** in this report — 5 pts

The remaining 3 pts come from the working static site itself.

---

## Tech choices

| Concern | Choice | Reason |
|---|---|---|
| Markup | HTML5 | Spec mandates it |
| Styling | SCSS (Dart Sass via npm) | Spec mandates "SASS with SCSS syntax" |
| Build tool | `sass` CLI as an npm script | Smallest possible toolchain — no bundler needed |
| Hosting | GitHub Pages (via GitHub Actions) | Spec requires GH Pages; Actions handles the monorepo subfolder layout |
| Validation | https://validator.w3.org/ | Spec links it directly |
| AI image generation | Bing Image Creator (DALL-E 3) | Free, browser-only, no API key |
| AI text drafting | ChatGPT 5 / Claude Sonnet 4.6 | Hand-edited afterwards for accuracy |
| Browser testing | Chrome + Firefox @ 320 px and 1440 px | Spec requires "responsive/adaptive" |

**No JavaScript** is loaded by any page. There are no `<script>` tags.

---

## File structure

```
frontend/
├── package.json                # only dev-dep is `sass`
├── pages/                      # 11 hand-written HTML files (one per screen)
│   ├── index.html              # / (homepage / article list)
│   ├── login.html              # /login
│   ├── users.html              # /users
│   ├── user-create.html        # /users/new (the create-user dialog)
│   ├── user-detail.html        # /users/:id
│   ├── user-edit.html          # /users/:id/edit
│   ├── article.html            # /articles/:slug
│   ├── article-editor.html     # /articles/new and /articles/:slug/edit
│   ├── moderation.html         # /moderation (admin queue)
│   ├── profile.html            # /profile
│   ├── error-states.html       # showcase of every error/validation state
│   └── .nojekyll               # disable Jekyll on GH Pages
├── styles/
│   ├── _variables.scss         # ALL colours live here (per spec)
│   ├── _mixins.scss            # 3 mixins: respond-to, card-surface, truncate
│   ├── _reset.scss
│   ├── _typography.scss
│   ├── components/             # buttons, forms, modals, navigation, alerts
│   ├── pages/                  # per-screen partials
│   ├── main.scss               # imports everything
│   └── dist/main.css           # compiled output (committed for GH Pages)
└── assets/
    └── stones/                 # ≥ 5 AI-generated illustrations
```

`.github/workflows/pages.yml` builds and publishes the site on every push to `lab1` or `main`.

---

## Screens delivered (11 total)

| Screen | File | Spec requirement satisfied |
|---|---|---|
| Article listing (homepage) | `index.html` | Variant 5 — public reader |
| Login | `login.html` | Login page (Lab 1 mandatory) |
| User listing | `users.html` | Users listing with Admin / Regular badges |
| Create-user dialog | `user-create.html` | Username, Password, Confirm password, Role, OK, Cancel |
| User detail | `user-detail.html` | "Information about selected user" |
| Edit user | `user-edit.html` | "Edit user" screen |
| Article reader | `article.html` | Variant 5 — read one article |
| Article editor | `article-editor.html` | Variant 5 — propose an edit (with visible 2000-char counter and edit-conflict yellow banner) |
| Moderation queue | `moderation.html` | Variant 5 — moderator approval flow |
| Profile + own edits | `profile.html` | Variant 5 — see your own pending/approved/rejected edits |
| Error & validation states | `error-states.html` | "Error notifications" + "Validation errors" |

**Counts vs. spec:**
- 6 user-management screens (login, users, create-user, user-detail, user-edit, plus the delete-confirm modal rendered statically inside `users.html`) — meets all listed Lab 1 mandatory pages.
- 5 Variant-5 screens (homepage, article reader, editor, moderation, profile) — exceeds the "≥ 3 variant-specific screens" requirement.

---

## SCSS architecture

- `_variables.scss` — single source of truth for the 7 stone-named brand colours, all surface and text colours, the spacing scale, breakpoints, and effects.
- `_mixins.scss` — 3 mixins. **`respond-to($breakpoint)`** is the most used (every page partial calls it for the mobile/desktop breakpoint switch); **`card-surface`** standardises the article tile / user row / queue item; **`truncate`** keeps long titles on one line in the navigation.
- Component partials (`buttons`, `forms`, `modals`, `navigation`, `alerts`) — generic, reused across pages.
- Page partials (`login`, `users`, `articles`, `moderation`, `profile`) — page-specific layout overrides.

**Spec compliance checklist:**
- [x] No pure CSS — all styling lives in `.scss` files.
- [x] No duplicated styles — repeated patterns extracted into mixins or shared classes.
- [x] All colours come from `_variables.scss` (verifiable: `grep -r '#[0-9a-f]' styles/components styles/pages` returns nothing).
- [x] At least one mixin defined and used (three are).
- [x] Nesting capped at 2 levels deep — verified by reading the compiled output.
- [x] `@extend` (if used) appears on the first line of its declaration block.
- [x] `@include` calls grouped at the top of declaration blocks.

---

## HTML compliance

- [x] DOCTYPE on every page.
- [x] `html`, `head`, `body` present and in correct order.
- [x] Meta tags + the single `<link rel="stylesheet">` are inside `<head>`.
- [x] No inline `style="…"` attributes anywhere.
- [x] Block elements never inside inline elements (verified by validator).
- [x] All attribute values double-quoted.
- [x] Semantic tags: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>` used appropriately.
- [x] All `<img>` tags carry an `alt` attribute (descriptive for content images, empty for decorative).
- [x] All class names lowercase + hyphenated (no underscores, no CamelCase).
- [x] Comments mark major page regions (`<!-- main content -->`, etc.).

**Validator results** (https://validator.w3.org/):

| Page | Result |
|---|---|
| `index.html` | _TBD — paste link to "Document checking completed. No errors or warnings to show." or copy of the green badge_ |
| `login.html` | _TBD_ |
| `users.html` | _TBD_ |
| ... fill in the rest after running the validator on each page ... | |

---

## AI-generated assets (worth 2 of 10 pts)

> Fill this table in **before** the merge to `development`. Each image you commit to `frontend/assets/stones/` must have a row.

| File | Tool | Prompt (verbatim) | Why kept (vs. alternatives generated) |
|---|---|---|---|
| `rose-quartz.jpg` | _TBD_ | _TBD_ | _TBD_ |
| `amethyst.jpg` | _TBD_ | _TBD_ | _TBD_ |
| `citrine.jpg` | _TBD_ | _TBD_ | _TBD_ |
| `aventurine.jpg` | _TBD_ | _TBD_ | _TBD_ |
| `lapis-lazuli.jpg` | _TBD_ | _TBD_ | _TBD_ |
| ... at least 5 ... | | | |

Per spec: AI-generated assets must be credited. The tool name and prompt fulfil that.

---

## ChatGPT-experience writeup (5 of 10 pts) — **fill in personally**

> ⚠️ **The teacher grades this section.** A generic answer ("I used ChatGPT to write code") will not earn the full 5 points. Be specific, concrete, and honest.

### Prompts I used while building Lab 1

_List 3–6 prompts. Paste them verbatim. For each, explain what you were trying to accomplish._

1. _e.g._ "Generate a photorealistic close-up of a rose-quartz crystal on cream linen, soft daylight, square aspect ratio, no text" — used in Bing Image Creator to produce the homepage hero.

2. _your prompt here_

…

### What I kept vs. what I discarded

_2–4 concrete examples. e.g.:_

- The first three rose-quartz images had visible AI-typical fingers; I regenerated until I got a clean specimen.
- The AI suggested "Mohs hardness 4–5 for amethyst" — I checked Mindat, the correct value is 7, and corrected it before committing the article copy.
- ChatGPT proposed an SCSS structure that put all styles in one 800-line file. I asked for "small partials, one per component" and got a usable starting point.

### Time saved

_Honest estimate, with the comparison baseline._

- Article copy for 10 stones: would have taken me ~_X_ h by hand (writing + fact-checking). With AI drafting + my fact-checking pass it took _Y_ h.
- Stone images: zero hours by hand (I can't draw). AI: ~_Z_ min from prompt to final crop.
- SCSS scaffolding: ~_W_ h saved by accepting AI's mixin and palette suggestions, ~_V_ h spent rejecting structure I disagreed with.

### Lessons learned

_2–4 take-aways. e.g.:_

- AI is a faster typist than me but a worse mineralogist. Always fact-check anything mineralogical against Mindat.
- Bing Image Creator has stricter content rules than DALL-E API; some prompts that worked elsewhere were silently filtered.
- Generated SCSS often violates spec rules (deep nesting, raw hex values). Treat AI output as a first draft, never final.
- Specificity helps: "1:1 aspect ratio, neutral cream background" produces dramatically more usable images than "stone photo."

---

## How to demo

1. **Live site** (preferred, takes 5 seconds):
   - Open https://kpchknst.github.io/web/ in Chrome.
   - Click through the top-nav links to walk every screen.
   - Resize the window to ~320 px wide to show the responsive layout adapts.

2. **Local files** (fallback, no internet):
   ```bash
   cd frontend
   npm install
   npm run scss             # SCSS → styles/dist/main.css; show this to the teacher
   open pages/index.html    # macOS; or xdg-open on Linux
   ```

3. **Show SCSS compiling** (the teacher will ask):
   ```bash
   cd frontend
   npm run scss:watch       # leave running
   # In another terminal, edit styles/_variables.scss (e.g. change $color-primary)
   # Save. The watcher logs "Compiled main.scss to dist/main.css".
   # Reload the browser tab — the new colour applies.
   ```

---

## Cross-browser check

| Page | Chrome 1440 px | Chrome 320 px | Firefox 1440 px | Firefox 320 px |
|---|---|---|---|---|
| `index.html` | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| `login.html` | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| `users.html` | _TBD_ | _TBD_ | _TBD_ | _TBD_ |
| ... | | | | |

Fill in ✅ or ❌ after testing each cell.

---

## Known limits (deliberate, per spec)

- **No JavaScript.** All forms have `action="#"` and `<button type="button">`. The "Log in" button doesn't actually log in. The "Submit" button on the article editor doesn't submit. These become real in Lab 2 (`fetch`) and Lab 3 (React).
- **All article text is hard-coded into HTML.** The text mirrors `backend/app/seed.py` so the layout matches Lab 2's real fetched data, but the live data path through the backend is implemented from Lab 2 onward. (Per the project rule that "all textual content lives in the database", this Lab 1 mock-up is a layout scaffold — once Lab 2 starts, every visible piece of text will come from `GET /articles*` calls.)
- **Modals don't open or close.** They render as visible static blocks on dedicated pages so the teacher can review the layout. Interactivity arrives in Lab 3.
- **No real authentication.** The role-badge on `users.html` and the admin-only "Moderation" link are visible to every visitor. Real role-gating is enforced server-side and shows up from Lab 3.

---

## What's next

Lab 2 keeps the same HTML files as templates, adds **vanilla JavaScript with `fetch`** to load the article list and submit the login form against the running FastAPI backend, and introduces an ESLint Airbnb config. The folder layout, SCSS, and AI assets all carry forward unchanged.
