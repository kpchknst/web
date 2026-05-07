# AI-generated stone illustrations

This folder holds the **10 AI-generated stone images** required by Lab 1 (worth 2 of the 10 graded points). All ten are present and live on the homepage cards (`index.html`) and the article-reader hero (`article.html`).

The full credit, prompt, and per-stone *why kept* notes live in [`docs/lab1-report.md`](../../../../docs/lab1-report.md#ai-generated-assets-worth-2-of-10-pts) — that's the file the teacher reads.

## Required filenames

The HTML expects images at these paths (relative to `frontend/pages/`):

| Slug | Recommended filename |
|---|---|
| rose-quartz | `assets/stones/rose-quartz.jpg` |
| aventurine | `assets/stones/aventurine.jpg` |
| amethyst | `assets/stones/amethyst.jpg` |
| citrine | `assets/stones/citrine.jpg` |
| black-tourmaline | `assets/stones/black-tourmaline.jpg` |
| lapis-lazuli | `assets/stones/lapis-lazuli.jpg` |
| moonstone | `assets/stones/moonstone.jpg` |
| tigers-eye | `assets/stones/tigers-eye.jpg` |
| selenite | `assets/stones/selenite.jpg` |
| carnelian | `assets/stones/carnelian.jpg` |

Generate **at least 5** of these. The other 5 keep their CSS gradient placeholders until you have time to fill them in.

## Recommended generator: Bing Image Creator

Free, browser-only, no API key. Uses DALL-E 3 under the hood.

1. Go to https://www.bing.com/create
2. Sign in with a Microsoft account (free).
3. Use the prompt template below, replacing `{stone-name}` with the stone you want.
4. Pick the most photorealistic result, right-click → Save image as → save into this folder with the matching filename above.

## Prompt template (works well across all 10 stones)

```
Photorealistic close-up of a single polished {stone-name} crystal on a soft cream linen surface.
Natural daylight from the left, very shallow depth of field, neutral background.
1:1 aspect ratio, professional product photography, no text or watermark.
```

Examples to try:

- `…polished rose quartz crystal on a soft cream linen surface…`
- `…polished green aventurine cabochon on a soft cream linen surface…`
- `…raw amethyst geode on a soft cream linen surface…`
- `…polished citrine point on a soft cream linen surface…`
- `…raw black tourmaline schorl crystal on a soft cream linen surface…`

## After saving

1. Compress with `jpegoptim --max=80 frontend/pages/assets/stones/*.jpg` (or any image compressor — keep each file under ~150 KB).
2. Add a row in `docs/lab1-report.md` &rarr; *AI-generated assets* table: tool used, exact prompt, why you kept this one over alternatives.
3. (Optional) Update the relevant HTML page to swap the placeholder `<div class="card__thumb">` for `<img src="assets/stones/{slug}.jpg" alt="A polished {stone} crystal on cream linen">` when you want to switch from gradient to photo.

## Licensing note

Per the spec footer, AI-generated assets must be credited. Recording the tool name and prompt in `docs/lab1-report.md` fulfils that.
