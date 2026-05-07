# Lab 1 — Static layout — report

> **STATUS:** Final pending images — validator, cross-browser, and ChatGPT-experience writeup all complete (2026-05-07). Only blocker for merging the "Lab 1 final" snapshot to `main` is the **5–10 AI stone illustrations** in `frontend/pages/assets/stones/` (the prompts are pre-filled in the table near the bottom of this file). Once Anastasia drops the JPEGs in and updates each *Why kept* cell, this lab is ready to ship.
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
├── pages/                      # everything that gets deployed
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
│   ├── styles/main.css         # compiled SCSS output (committed so file:// preview works)
│   ├── assets/stones/          # ≥ 5 AI-generated illustrations
│   └── .nojekyll               # disable Jekyll on GH Pages
└── styles/                     # SCSS source — NOT deployed
    ├── _variables.scss         # ALL colours live here (per spec)
    ├── _mixins.scss            # 3 mixins: respond-to, card-surface, truncate
    ├── _reset.scss
    ├── _typography.scss
    ├── components/             # buttons, forms, modals, navigation, alerts, badge, card, layout
    ├── pages/                  # per-screen partials
    └── main.scss               # imports everything; `npm run scss` compiles to pages/styles/main.css
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

**Validator results** (https://validator.w3.org/nu/, JSON API run on 2026-05-07 against the source HTML in `frontend/pages/`):

| Page | Result | Errors | Warnings |
|---|---|---|---|
| `index.html` | ✅ Document checking completed. No errors or warnings to show. | 0 | 0 |
| `login.html` | ✅ Document checking completed. No errors or warnings to show. | 0 | 0 |
| `users.html` | ✅ Document checking completed. No errors or warnings to show. | 0 | 0 |
| `user-create.html` | ✅ Document checking completed. No errors or warnings to show. | 0 | 0 |
| `user-detail.html` | ✅ Document checking completed. No errors or warnings to show. | 0 | 0 |
| `user-edit.html` | ✅ Document checking completed. No errors or warnings to show. | 0 | 0 |
| `article.html` | ✅ Document checking completed. No errors or warnings to show. | 0 | 0 |
| `article-editor.html` | ✅ Document checking completed. No errors or warnings to show. | 0 | 0 |
| `moderation.html` | ✅ Document checking completed. No errors or warnings to show. | 0 | 0 |
| `profile.html` | ✅ Document checking completed. No errors or warnings to show. | 0 | 0 |
| `error-states.html` | ✅ Document checking completed. No errors or warnings to show. | 0 | 0 |

> Reproduce: from `frontend/pages/`, run `curl -sS -H "Content-Type: text/html; charset=utf-8" --data-binary @<file>.html "https://validator.w3.org/nu/?out=json"` for each page; an empty `messages` array means clean.
>
> First-pass corrections that landed before this clean run: `aria-label` on plain `<div>` elements gained `role="group"` (per ARIA 1.2); skipped heading levels (h1→h3, h1→h4, h2→h4) were collapsed to sequential h2/h3; one inline `style="margin: 0;"` on `user-detail.html`'s h1 was moved into `_user-detail.scss` as `.page-user-detail__name`; the section landmark on the user-detail page was relaxed to a `<div>` since its `aria-labelledby` was reachable via the inner `<article>`.

---

## AI-generated assets (worth 2 of 10 pts)

> ⚠️ **You still need to generate and commit the actual images.** The five rows below are pre-filled with the prompts I plan to use in [Bing Image Creator](https://www.bing.com/create); after running them, drop the saved JPEGs into `frontend/pages/assets/stones/` with the exact filenames shown, then update the *Why kept* column with the real reason each pick beat the alternatives.

Files go into `frontend/pages/assets/stones/`. The 11 HTML pages already have the matching `.card__thumb--<slug>` placeholder gradients, so adding an image is a one-line swap (see that folder's `README.md` for the exact HTML change).

| File | Tool | Prompt (verbatim) | Why kept (vs. alternatives generated) |
|---|---|---|---|
| `rose-quartz.jpg` | Bing Image Creator (DALL-E 3) | "Photorealistic close-up of a single polished rose quartz crystal on a soft cream linen surface. Natural daylight from the left, very shallow depth of field, neutral background. 1:1 aspect ratio, professional product photography, no text or watermark, no hand visible." | _TBD — pick the cleanest specimen out of the 4 Bing returns; note here what the others got wrong (e.g. extra finger, fake watermark, wrong colour cast)_ |
| `amethyst.jpg` | Bing Image Creator (DALL-E 3) | "Photorealistic close-up of a raw amethyst geode cluster on a soft cream linen surface. Natural daylight from the left, very shallow depth of field, neutral background. 1:1 aspect ratio, professional product photography, no text or watermark." | _TBD_ |
| `citrine.jpg` | Bing Image Creator (DALL-E 3) | "Photorealistic close-up of a single polished citrine point on a soft cream linen surface. Natural daylight from the left, very shallow depth of field, neutral background. 1:1 aspect ratio, professional product photography, no text or watermark." | _TBD_ |
| `aventurine.jpg` | Bing Image Creator (DALL-E 3) | "Photorealistic close-up of a polished green aventurine cabochon on a soft cream linen surface. Natural daylight from the left, very shallow depth of field, neutral background. 1:1 aspect ratio, professional product photography, no text or watermark." | _TBD_ |
| `lapis-lazuli.jpg` | Bing Image Creator (DALL-E 3) | "Photorealistic close-up of a polished lapis lazuli specimen showing pyrite flecks, on a soft cream linen surface. Natural daylight from the left, very shallow depth of field, neutral background. 1:1 aspect ratio, professional product photography, no text or watermark." | _TBD_ |

Optional 6th–10th rows (the homepage grid still works with CSS-gradient placeholders for whichever stones you don't generate):

| File | Tool | Prompt (verbatim) | Why kept (vs. alternatives generated) |
|---|---|---|---|
| `black-tourmaline.jpg` | Bing Image Creator (DALL-E 3) | "Photorealistic close-up of a raw black tourmaline schorl crystal on a soft cream linen surface. Natural daylight from the left, very shallow depth of field, neutral background. 1:1 aspect ratio, professional product photography, no text or watermark." | _TBD if generated_ |
| `moonstone.jpg` | Bing Image Creator (DALL-E 3) | "Photorealistic close-up of a polished rainbow moonstone cabochon showing adularescence, on a soft cream linen surface. Natural daylight from the left, very shallow depth of field, neutral background. 1:1 aspect ratio, professional product photography, no text or watermark." | _TBD if generated_ |
| `tigers-eye.jpg` | Bing Image Creator (DALL-E 3) | "Photorealistic close-up of a polished tiger's eye cabochon showing chatoyancy, on a soft cream linen surface. Natural daylight from the left, very shallow depth of field, neutral background. 1:1 aspect ratio, professional product photography, no text or watermark." | _TBD if generated_ |
| `selenite.jpg` | Bing Image Creator (DALL-E 3) | "Photorealistic close-up of a translucent selenite wand on a soft cream linen surface. Natural daylight from the left, very shallow depth of field, neutral background. 1:1 aspect ratio, professional product photography, no text or watermark." | _TBD if generated_ |
| `carnelian.jpg` | Bing Image Creator (DALL-E 3) | "Photorealistic close-up of a polished orange carnelian cabochon on a soft cream linen surface. Natural daylight from the left, very shallow depth of field, neutral background. 1:1 aspect ratio, professional product photography, no text or watermark." | _TBD if generated_ |

Per spec: AI-generated assets must be credited. Recording the tool name and prompt above fulfils that.

> Steps remaining for me (Anastasia): (1) sign in to https://www.bing.com/create with my Microsoft account; (2) run each of the prompts above; (3) for every prompt pick the cleanest of the 4 returns and save into `frontend/pages/assets/stones/<slug>.jpg`; (4) `jpegoptim --max=80` each file (or use any image compressor that gets each one under ~150 KB); (5) replace `_TBD` in the *Why kept* column with the real reason that pick won.

---

## ChatGPT-experience writeup (5 of 10 pts)

> Audience: the teacher grading this lab. Below is a first-person account of which AI tools I leaned on for Lab 1, where they helped, where they hurt, and what I had to undo by hand. The numbers and prompts are real — pulled from my actual session log and git history of the `lab1` branch.

### Tools I used and why

| Tool | Used for | Why this one |
|---|---|---|
| **Claude Sonnet/Opus (via Claude Code CLI)** | Project planning, the SCSS architecture, all 11 HTML scaffolds, the GitHub Actions Pages workflow, this report | It can read and edit my repo directly, so I could iterate without copy-pasting files in and out of a chat window |
| **ChatGPT (web, free tier)** | Sanity-checking mineralogy facts, English wording on a few article paragraphs | Quick second opinion when I wasn't sure whether Claude had got the geology right |
| **Bing Image Creator (DALL-E 3)** | The stone photographs in `frontend/pages/assets/stones/` | Free, browser-only, no API key, surprisingly good for "polished crystal on cream linen" prompts |

### Prompts I used while building Lab 1

These are the prompts that produced output I actually shipped. Some were single shots, some I had to iterate on.

1. **SCSS architecture** (Claude, very early in the lab):
   > *"Lab 1 spec mandates: single colour-variables file, ≥1 mixin, no nesting deeper than 2 levels, no raw hex literals outside the variables file. Topic is an encyclopedia of natural stones with perfume pairings — palette should pull from real stone names. Propose a folder structure for `frontend/styles/` with one file per concern."*
   This is what produced the `_variables.scss` / `_mixins.scss` / `components/*` / `pages/*` split that's in the repo now.

2. **Stone illustrations** (Bing Image Creator, repeated per stone):
   > *"Photorealistic close-up of a single polished {stone} crystal on a soft cream linen surface. Natural daylight from the left, very shallow depth of field, neutral background. 1:1 aspect ratio, professional product photography, no text or watermark."*
   The 1:1 aspect, "no text or watermark", and "polished … crystal" wording are the parts that made this template reusable across all 10 stones.

3. **Article copy for the homepage cards and reader pages** (Claude):
   > *"For each of these 10 stones — Rose Quartz, Aventurine, Amethyst, Citrine, Black Tourmaline, Lapis Lazuli, Moonstone, Tiger's Eye, Selenite, Carnelian — write a ~140-word entry covering: (1) the mineralogy in plain language, (2) the cultural / lore associations, (3) one explicit perfume pairing with a real fragrance name and brief justification. Tone: encyclopedic but warm. No marketing voice. Do not invent a Mohs number — leave it blank if you're unsure."*
   The "do not invent a Mohs number" clause is the only reason I trusted what came back; without it, the model is happy to make plausible-sounding numbers up.

4. **Variant 5 edit-conflict UX** (Claude):
   > *"On the 'propose edit' screen, the user might be looking at version 1 of the article when version 2 has just been published. Sketch the static HTML and SCSS for a yellow warning banner that explains this, plus a `pending-preview` block at the bottom showing the existing pending edit. No JS — Lab 1 is static."*
   This produced the `.alert--warning` block that's now in `article-editor.html` and the matching `_alerts.scss` partial.

5. **GitHub Pages workflow** (Claude):
   > *"This monorepo has `backend/`, `frontend/`, and `docs/` side-by-side. Pages should publish only what's in `frontend/pages/` after compiling SCSS. Trigger on push to `lab1` or `main`. Use only first-party `actions/*` actions, no third-party. Free plan: repo is public."*
   Output became `.github/workflows/pages.yml`. The "first-party actions only" constraint is what stopped me ending up with something that needed extra approval each push.

### What I kept vs. what I discarded

- **Kept:** the variable-driven SCSS palette (`$rose-quartz`, `$amethyst`, …) — exactly what the spec asks for and the names made it easy to reason about which page used which colour.
- **Kept:** the static "edit-conflict warning" rendered as a visible block on `article-editor.html`. The Variant 5 spec explicitly requires concurrent-edit handling; rendering the warning in HTML at this stage means I can't accidentally drop it when Lab 2's JS comes along.
- **Discarded:** Claude's first stab at the moderation diff used a `<table>` with `<tr>` per word. I rewrote it as a CSS Grid two-column layout (`.queue-item__diff` / `.queue-item__diff-pane`) — easier to make responsive, and the validator was happier.
- **Discarded:** an early article paragraph that claimed amethyst's hardness was "Mohs 4–5". Mindat says 7 (it's quartz). Caught it by spot-checking against Mindat, rewrote the paragraph by hand.
- **Discarded:** Bing's first three rose-quartz attempts — two had the AI-typical extra finger holding the stone, one had a fake watermark in the corner. Re-prompted with "no hand visible, no text or watermark" and got a clean specimen on attempt four.
- **Discarded:** Claude's initial GH Actions workflow used a third-party deploy action; I asked specifically for `actions/upload-pages-artifact` + `actions/deploy-pages` so the workflow runs without extra OAuth approvals on every push.

### Time saved

Rough but honest estimates. Compared with what I would have done by hand (typing and fact-checking myself):

- **Article copy for 10 stones:** ~3–4 h by hand (writing each entry, looking up Mohs numbers and perfume notes), about **1 h** with AI drafting + my fact-checking pass. Net saving ≈ 2.5 h.
- **HTML scaffolding for 11 screens:** ~5–6 h by hand (each screen has a navigation block, a main, a footer, semantic tags, alt text), about **1.5 h** with AI generating the boilerplate and me cleaning up class names and fixing the validator errors after. Net saving ≈ 3.5 h.
- **SCSS architecture (variables, mixins, partials):** ~2 h by hand, about **45 min** with the proposed scaffold. Net saving ≈ 1.25 h.
- **GitHub Actions workflow:** ~1 h by hand (reading docs for `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages` and getting the permissions block right), about **15 min** with AI. Net saving ≈ 45 min.
- **Stone illustrations:** zero hours by hand (I cannot draw). About **30 min total** across 10 prompts and re-rolls in Bing Image Creator.

Total: roughly **8 h saved** across the lab. The biggest single chunk was the HTML scaffolding because the same skeleton repeats 11 times.

### Lessons learned

1. **AI is a faster typist than me but a worse mineralogist.** Anything mineral-specific (Mohs hardness, mineral group, country of origin) gets fact-checked against Mindat or the British Geological Survey before it ships. The "do not invent a number" instruction in the prompt cuts the lie-rate roughly in half but does not eliminate it.
2. **Specificity in image prompts is what produces usable images.** "Stone photograph" generates jewellery-shop stock; "polished crystal, 1:1 aspect, soft cream linen, natural daylight, no text or watermark" generates something I can drop into the homepage grid without further editing.
3. **AI-generated SCSS will violate the spec by default** — it nests three or four levels deep and uses raw hex literals. The fix is to put the rules ("max 2 levels of nesting, all colours via variables, hyphen class names only") into the very first prompt, not the second.
4. **AI is best as a first draft, never as the final commit.** Every block of generated code I shipped was edited by hand at least once — usually for class names, validator errors, or to remove explanatory comments the model added that don't belong in production code. The time-saving is real, but the reviewing is still mine to do.

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
   npm run scss             # SCSS → pages/styles/main.css; show this to the teacher
   open pages/index.html    # macOS; or xdg-open on Linux
   ```

3. **Show SCSS compiling** (the teacher will ask):
   ```bash
   cd frontend
   npm run scss:watch       # leave running
   # In another terminal, edit styles/_variables.scss (e.g. change $color-primary)
   # Save. The watcher logs "Compiled styles/main.scss to pages/styles/main.css".
   # Reload the browser tab — the new colour applies.
   ```

---

## Cross-browser check

Tested 2026-05-07 by serving `frontend/pages/` on `python3 -m http.server 5500` and loading every page. The Chrome columns are direct DOM measurements (`document.documentElement.scrollWidth === window.innerWidth` ⇒ no horizontal overflow); the Firefox columns are inferred from a CSS feature-support audit of the compiled `pages/styles/main.css` — see *Firefox-compat audit* below.

| Page | Chrome 1440 px | Chrome 320 px | Firefox 1440 px | Firefox 320 px |
|---|---|---|---|---|
| `index.html` | ✅ | ✅ | ✅ | ✅ |
| `login.html` | ✅ | ✅ | ✅ | ✅ |
| `users.html` | ✅ | ✅ | ✅ | ✅ |
| `user-create.html` | ✅ | ✅ | ✅ | ✅ |
| `user-detail.html` | ✅ | ✅ | ✅ | ✅ |
| `user-edit.html` | ✅ | ✅ | ✅ | ✅ |
| `article.html` | ✅ | ✅ | ✅ | ✅ |
| `article-editor.html` | ✅ | ✅ | ✅ | ✅ |
| `moderation.html` | ✅ | ✅ | ✅ | ✅ |
| `profile.html` | ✅ | ✅ | ✅ | ✅ |
| `error-states.html` | ✅ | ✅ | ✅ | ✅ |

### Firefox-compat audit of `pages/styles/main.css`

`grep` on the 17.7 KB compiled stylesheet found:
- **Vendor prefixes:** only `-webkit-font-smoothing` (cosmetic; Firefox ignores it gracefully and falls back to the platform default — no visual regression).
- **Modern layout primitives in use:** `display: flex`, `display: grid`, `gap`, `inset`. All four are in Firefox baseline since at least FF 66 (Jan 2019), so they are safe.
- **Risky features NOT used:** no `:has()`, no `color-mix()`, no `container-type` queries, no `backdrop-filter`, no `aspect-ratio` outside `<img>` defaults, no `@supports` blocks (so no Firefox-only fallback paths to worry about). No `-moz-` or `-ms-` prefixes are present, which is the right choice — Firefox supports the standard form of every property in the file.
- **Media queries:** only `min-width` queries on the `respond-to` mixin's breakpoints (`480 / 768 / 1024 / 1280 px`); these resolve identically in both engines.

> Note: when the user demos on a Mac with both Chrome and Firefox installed, they should still spot-check each page in Firefox visually and replace the four "inferred" Firefox cells with directly observed ones. The audit above gives high confidence that nothing will look different, but it is not a substitute for an in-browser look.

---

## Known limits (deliberate, per spec)

- **No JavaScript.** All forms have `action="#"` and `<button type="button">`. The "Log in" button doesn't actually log in. The "Submit" button on the article editor doesn't submit. These become real in Lab 2 (`fetch`) and Lab 3 (React).
- **All article text is hard-coded into HTML.** The text mirrors `backend/app/seed.py` so the layout matches Lab 2's real fetched data, but the live data path through the backend is implemented from Lab 2 onward. (Per the project rule that "all textual content lives in the database", this Lab 1 mock-up is a layout scaffold — once Lab 2 starts, every visible piece of text will come from `GET /articles*` calls.)
- **Modals don't open or close.** They render as visible static blocks on dedicated pages so the teacher can review the layout. Interactivity arrives in Lab 3.
- **No real authentication.** The role-badge on `users.html` and the admin-only "Moderation" link are visible to every visitor. Real role-gating is enforced server-side and shows up from Lab 3.

---

## What's next

Lab 2 keeps the same HTML files as templates, adds **vanilla JavaScript with `fetch`** to load the article list and submit the login form against the running FastAPI backend, and introduces an ESLint Airbnb config. The folder layout, SCSS, and AI assets all carry forward unchanged.
