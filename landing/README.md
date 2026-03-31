# ShadowAssist landing

Vite + React + React Router + Framer Motion + react-markdown. Marketing home plus on-site docs (no GitHub redirects for reading).

## Develop

```bash
cd landing
npm install
npm run dev
```

Open `http://localhost:5174/` (base `/`).

## Production build (matches GitHub Pages)

```bash
cd landing
VITE_BASE_PATH=/ShadowAssist/ npm run build
```

Output: `landing/dist/`. `404.html` is a copy of `index.html` so client-side routes work on GitHub Pages.

## Content sources

- **How it works** — `../HOW_IT_WORKS.md` (imported at build time as raw markdown).
- **Terms / privacy** — `../legal/terms.txt` and `../legal/privacy.txt`.

Changing those files triggers **Deploy landing** when you push to `stag` (see workflow `paths`).

## Deploy

Repo **Pages → Source: GitHub Actions**. Workflow builds this package and uploads `landing/dist`.

Live URL pattern: `https://<user>.github.io/<repo>/`

## Routes

| Path | Content |
|------|---------|
| `/` | Home |
| `/docs` | Docs index |
| `/docs/how-it-works` | Full HOW_IT_WORKS |
| `/legal/terms` | Terms summary |
| `/legal/privacy` | Privacy summary |

Downloads still resolve the latest release assets via the GitHub API (`src/lib/releases.ts`).
