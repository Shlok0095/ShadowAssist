# Landing environment variables (Vite)

Optional — defaults match `github.com/Shlok0095/ShadowAssist` and tag `latest-stag`.

| Variable | Purpose |
|----------|---------|
| `VITE_REPO_OWNER` | GitHub org or user |
| `VITE_REPO_NAME` | Repository name |
| `VITE_ROLLING_TAG` | Release tag for Windows artifacts (e.g. `latest-stag`) |
| `VITE_BASE_PATH` | Set by CI for GitHub Pages (e.g. `/ShadowAssist/`) |

Create a local file `.env` (gitignored) with `VITE_*` keys to override.
