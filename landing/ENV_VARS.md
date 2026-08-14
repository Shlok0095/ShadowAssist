# Landing environment variables (Vite)

Optional — defaults match `github.com/Shlok0095/VeilAssist`. Vercel sets the production channel to `latest`; GitHub Pages sets the beta channel to `latest-stag`.

| Variable | Purpose |
|----------|---------|
| `VITE_REPO_OWNER` | GitHub org or user |
| `VITE_REPO_NAME` | Repository name |
| `VITE_ROLLING_TAG` | Release tag for Windows artifacts (e.g. `latest-stag`) |
| `VITE_BASE_PATH` | Set by CI for GitHub Pages (e.g. `/ShadowAssist/`) |
| `VITE_SITE_ORIGIN` | Canonical website origin used for first-party download routes |
| `VITE_DOWNLOAD_SETUP_URL` | Optional complete installer URL override |

### Server-only (Vercel dashboard — never `VITE_`)

| Variable | Purpose |
|----------|---------|
| `NVIDIA_API_KEY` | NVIDIA NIM API key for `/api/interview/chat` (mobile interview app) |
| `NVIDIA_CHAT_MODEL` | Optional model id (default `nvidia/nemotron-nano-12b-v2-vl`) |

Create a local file `.env` (gitignored) with `VITE_*` keys to override.
For API routes locally, run `npx vercel dev` from the `landing/` folder.
