# Frontend

Evolves across labs:

| Lab | What's here |
|---|---|
| 1 | Static HTML pages + SCSS, deployed to GitHub Pages |
| 2 | Same pages + vanilla JS using `fetch` + ESLint Airbnb config |
| 3+ | Vite + React rewrite, all static templates become components |
| 5 | + Vitest + React Testing Library + MSW |
| 6 | + native WebSocket client for live moderation queue |

This folder is a placeholder until **Lab 1** runs. See `docs/lab1-guide.md` for the build steps.

When Lab 1 starts, expect this structure:

```
frontend/
├── pages/          # login.html, articles.html, article.html, …
├── styles/         # main.scss, _variables.scss, _mixins.scss, _components/…
├── assets/         # AI-generated stone images
├── package.json    # has "scss:watch" and "scss:build" scripts
└── README.md
```

When Lab 3 starts, the structure changes to a Vite + React project:

```
frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── api/
│   ├── styles/
│   └── main.jsx
├── public/
├── index.html
├── vite.config.js
├── package.json
└── README.md
```
