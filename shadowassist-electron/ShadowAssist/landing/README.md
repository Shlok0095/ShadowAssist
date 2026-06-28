# VeilAssist landing

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

- **User guide** — `../docs/user-guide/*.md` (14 sections; imported via `src/config/docsNav.ts`).
- **Getting started** — `src/content/getting-started.md`.
- **Shipping** — `../docs/LAUNCH_END_TO_END.md`.
- **Terms / privacy** — `../legal/terms.txt` and `../legal/privacy.txt`.

In-app **Settings → Help** loads the same user-guide sections via `lib/userGuideDoc.js`.

Changing guide files triggers **Deploy landing** when you push to `stag` (see workflow `paths`).

## Deploy

Repo **Pages → Source: GitHub Actions**. Workflow builds this package and uploads `landing/dist`.

Live URL pattern: `https://<user>.github.io/<repo>/`

## Routes

| Path | Content |
|------|---------|
| `/` | Home |
| `/docs` | Docs hub |
| `/docs/getting-started` | Download & first launch |
| `/docs/overview` … `/docs/troubleshooting` | Feature guides (14 chapters) |
| `/docs/shipping` | Release & CI (maintainers) |
| `/legal/terms` | Terms |
| `/legal/privacy` | Privacy |

Downloads still resolve the latest release assets via the GitHub API (`src/lib/releases.ts`).
