# ShadowAssist landing (static)

1. `site-config.js` is set for **Shlok0095/ShadowAssist**. Download buttons use the **GitHub API** (`main.js`) to pick the latest `ShadowAssist-Setup-*.exe` / `ShadowAssist.exe`; change `API_LATEST` in `main.js` if you fork the repo.
2. **GitHub Pages:** enable Pages (Source: GitHub Actions) on the repo; pushes to **`stag`** deploy via `.github/workflows/deploy-landing.yml`. Live site: **https://shlok0095.github.io/ShadowAssist/**
3. Optionally copy `../legal/*.txt` into `legal/` here if you deploy without raw GitHub URLs.
4. Or upload this folder to Netlify / Vercel / Cloudflare (no build step).

See `../docs/LAUNCH_END_TO_END.md` for the full release workflow.
