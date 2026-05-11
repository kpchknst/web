# 2026-05-12 — Design refresh ("Apothecary" direction)

**Status:** approved, ready to implement
**Branch:** lab4 (the redesign ships as part of Lab 4 + flows into main)
**Scope:** SPA-only (`frontend/src/**`, plus override CSS). Lab 1 static `frontend/pages/*.html` is untouched and stays validator-clean.

## Goal

Replace the current dry, daylight-blue layout with an Apothecary mood:
dark by default, deep amethyst-black background, drifting organic blobs
behind hero content, gold-leaf accents on links and tag chips, cabochon-
shaped circular hero image, buttery Cormorant headings, soft motion that
respects `prefers-reduced-motion`.

The palette stays the same family (rose-quartz, amethyst, cream) — the
work is in tokenising it, adding dark mode, and warming the type/motion.

## Non-goals

- No new routes or pages.
- No JS logic changes (no edits to data fetching, auth, edits, moderation).
- No animation library (Framer Motion, GSAP). Pure CSS + one
  `IntersectionObserver` hook for scroll-in reveal.
- No changes to Lab 1 static HTML pages.
- No new bundle dependency. Target: keep the gzipped JS under 105 KB
  (currently 99.64 KB).

## 1. Typography

| Slot | Family | Size | Weight | Notes |
|---|---|---|---|---|
| Display (h1) | Cormorant Garamond | `clamp(2.25rem, 5vw, 3.75rem)` | 600 | line-height 1.1 |
| Section (h2) | Cormorant Garamond | `clamp(1.5rem, 3vw, 2rem)` | 600 | |
| Body | Inter | 1rem | 400 | line-height 1.75 on dark, 1.65 on light |
| Subtitle (italic) | Cormorant Garamond | 1.125rem | 400 | italic, muted colour |
| Drop cap | Cormorant Garamond | 4em | 600 | float-left on first paragraph |

Body columns capped at `65ch` for legibility.

## 2. Colour mode

CSS custom properties on `:root` for dark (default) and `[data-theme="light"]`
for opt-in light mode. Theme persists in `localStorage` under key
`stones-theme`. First load respects `prefers-color-scheme` if no stored
value. A tiny inline script in `index.html` sets `data-theme` before React
boots — prevents FOUC on reload.

| Token | Dark | Light |
|---|---|---|
| `--bg` | `#1a0f2e` | `#faf7f2` |
| `--surface` | `#261845` | `#ffffff` |
| `--surface-elev` | `#2f1d56` | `#fbfafd` |
| `--text` | `#f4ebd9` | `#2c1f33` |
| `--text-muted` | `#c9bbd6` | `#6b6373` |
| `--border` | `#3a275a` | `#e2dde6` |
| `--accent-gold` | `#d4a574` | `#b8893f` |
| `--rose` | `#f0c3c9` | `#e0a4b0` |
| `--amethyst` | `#b18ed4` | `#4a236f` |
| `--danger` | `#e58473` | `#c44e3e` |
| `--success` | `#9ed1b3` | `#4a7864` |
| `--shadow-card` | `0 8px 24px rgba(0,0,0,0.55)` | `0 2px 8px rgba(44,31,51,0.08)` |
| `--shadow-card-hover` | `0 16px 40px rgba(180,142,212,0.18)` | `0 12px 32px rgba(44,31,51,0.16)` |

## 3. Motion

- Easing: `--ease-butter: cubic-bezier(0.34, 1.56, 0.64, 1)` (slight overshoot).
- Duration: `--dur: 280ms`.
- **Card hover:** `translateY(-4px) rotate(-0.5deg)` + shadow grows.
- **Hero ken-burns:** `scale(1) ↔ scale(1.04)`, 12s alternate infinite.
- **Scroll-in reveal:** `IntersectionObserver` toggles `.is-visible` on
  `.card`, `.page-article__body p`, `.reading-result`. Hidden state:
  `opacity:0; transform: translateY(8px)`. Visible: `opacity:1; transform:none`.
  60ms stagger via `transition-delay`.
- **Route changes:** 200ms cross-fade on `<main>` (no router lib changes —
  just a class flip on path change).
- All wrapped in `@media (prefers-reduced-motion: reduce) { all → instant }`.

## 4. Organic-shapes backdrop

One `<OrganicBackdrop />` component renders an SVG fixed to the viewport,
`z-index: -1`, `pointer-events: none`. Two `<path>` blobs:
- Rose-quartz, `fill="var(--rose)"`, opacity `0.25`, blurred via
  `filter: blur(80px)`, animated `translate(0,0) → translate(40px,-30px) →
  translate(0,0)` over 20s ease-in-out infinite.
- Amethyst, `fill="var(--amethyst)"`, opacity `0.18`, blur 100px, 24s
  reverse animation.

The component accepts a `variant` prop:
- `homepage` (default): both blobs visible.
- `article`: only rose blob, smaller, positioned behind hero.
- `auth`: only amethyst blob, centred.
- `off`: render nothing (used on dense list pages like /moderation).

Disabled via `prefers-reduced-motion`.

## 5. Component-by-component changes

| Component | Change |
|---|---|
| `Layout.jsx` | Wrap children with `<OrganicBackdrop variant=…/>`, add `<ThemeToggle/>` slot in header. Set `data-route-transition` class on `<main>`. |
| `SiteHeader.jsx` | Frosted glass `backdrop-filter: blur(20px)` over `var(--bg-translucent)`. Gold-leaf hairline under logo. ThemeToggle button right of "Log out". |
| `HomePage.jsx` | Bigger H1 (Cormorant clamp), italic subtitle. Use `homepage` variant of backdrop. Cards get `.card--hover-lift` class. |
| Card thumbnail | Rounded top corners, image fill, hover scale 1.02. |
| `ArticlePage.jsx` | Hero image becomes circular cabochon (260px, `border-radius:50%`, inset rose-tinted shadow). Title bigger. First paragraph gets `<span class="dropcap">`. Body paragraphs flagged with `data-reveal`. Backdrop variant `article`. |
| `Badge.jsx` | Gold-ringed pill on dark. Inset shadow. |
| Buttons | `border-radius:14px`, amethyst-glow focus ring, soft hover lift. |
| `Spinner.jsx` | Replace three dots with a thin gold rotating ring (CSS-only). |
| `LoginPage` / `RegisterPage` / `UserForm` | Card centred, frosted on dark, Cormorant title. Backdrop `auth`. |
| `SiteFooter.jsx` | Dark mode: gold accent on the GH link. |
| `ConfirmModal.jsx` | Match new surface colour + shadow. |

## 6. File layout

New files:
- `frontend/src/components/ThemeToggle.jsx` (small button, ~30 LOC)
- `frontend/src/components/OrganicBackdrop.jsx` (SVG + CSS classes, ~50 LOC)
- `frontend/src/hooks/useRevealOnScroll.js` (`IntersectionObserver`, ~25 LOC)
- `frontend/src/styles/theme.css` (CSS custom properties for both modes)
- `frontend/src/styles/components.css` (component-level overrides using
  the new tokens — cards, badges, buttons, header, hero)
- `frontend/index.html` — add the inline FOUC-prevention script

Edited files:
- `frontend/src/main.jsx` — import `theme.css` before other styles
- `frontend/src/components/Layout.jsx` — slot backdrop + theme toggle
- `frontend/src/components/SiteHeader.jsx` — toggle slot
- `frontend/src/components/Spinner.jsx` — swap dot animation for ring
- `frontend/src/pages/ArticlePage.jsx` — drop-cap span on first paragraph,
  backdrop variant, reveal data-attrs
- `frontend/src/pages/HomePage.jsx` — backdrop variant, reveal data-attrs

Untouched:
- All SCSS in `frontend/styles/` (Lab 1 source) — pre-compiled CSS still
  loads as the base layer; new CSS overrides via cascade.
- All backend code.
- All route definitions and data fetching.

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Dark text-heavy reading hard for some users | Light-mode toggle, default to dark but easy to flip; theme persists. |
| Drifting blobs cause perf jank on low-end machines | CSS-only animation on `transform` + `opacity` (GPU-accelerated). Disabled in `prefers-reduced-motion`. |
| Backdrop blob z-index fights with sticky header | `OrganicBackdrop` is `position:fixed; z-index:-1; pointer-events:none`. Sticky header keeps `z-index:10`. |
| Drop cap breaks on short first paragraphs | Apply only when first paragraph length > 140 chars (JS guard in ArticlePage). |
| FOUC flash from dark→light or light→dark on reload | Inline `<script>` in `index.html` sets `data-theme` before React boots. |
| Cascade conflict with compiled `main.css` | New CSS files imported AFTER `pages/styles/main.css` in `main.jsx`. Selector specificity matched, so source order wins. |
| Build size creep | No new deps. Target gzipped JS ≤ 105 KB. Verify with `npm run build`. |

## 8. Verification checklist

- [ ] `npm run lint` silent (Airbnb config).
- [ ] `npm run build` succeeds, gzipped JS ≤ 105 KB.
- [ ] Toggle dark↔light persists across reload.
- [ ] Reload with `prefers-color-scheme: dark` set on OS → loads dark
  (when no stored value).
- [ ] Reduced-motion OS setting kills all animations and the backdrop.
- [ ] Homepage shows 10 cards, hover lift visible, no console errors.
- [ ] `/articles/rose-quartz` shows circular cabochon hero, drop cap on
  first paragraph, tag pills as gold-ringed chips (not the vertical bars).
- [ ] `/login`, `/register`, `/profile`, `/moderation`, `/tags`,
  `/my-reading`, `/articles/new`, `/articles/:slug/edit` all render
  without layout regressions in both themes.
- [ ] Test in Chrome AND Firefox (Lab 1/2/3 cross-browser discipline).

## 9. Out of scope (won't be in this PR)

- Mobile-first redesign of moderation diff view — keep current layout.
- Custom illustration for the blob silhouettes (SVG paths can be tuned later).
- Real-time Lab 6 toast styling — deferred to Lab 6 work.
- Sound design.
