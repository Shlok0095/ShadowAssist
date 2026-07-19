# Repository structure

VeilAssist is maintained as two independently installable products in one repository:

```text
.
├─ .github/workflows/                  CI, website deployment, Windows releases
├─ main/                               Electron main process
├─ lib/                                Desktop domain and infrastructure modules
├─ renderer/                           Electron renderer applications
├─ scripts/                            Desktop build, release, and test tooling
├─ docs/                               Engineering docs and bundled user guide
├─ legal/                              Bundled legal documents
├─ landing/                            Independent website package
├─ package.json                        Desktop package and repository commands
├─ vite.config.js                      Multi-window renderer build
└─ README.md                           Repository entry point
```

The desktop package intentionally owns the repository root. The website remains an independent package at `landing/` with its own manifest and lockfile.

## Ownership boundaries

### Desktop application

Repository root

- `main/` owns BrowserWindow lifecycle, IPC registration, sessions, and orchestration.
- `lib/` owns reusable domain and infrastructure services.
- `renderer/` owns UI surfaces. Renderer code must not import Node or Electron directly; it communicates through preload IPC.
- `scripts/` owns build/release/test tooling and is excluded from packaged application files.
- `out/`, `dist/`, generated `build/` assets, and `node_modules/` are not committed. `build/update-channel.txt` is the tracked local-package default.

### Website

`landing`

- It has an independent package manifest and lockfile.
- Vercel and GitHub Pages build this directory directly.
- It must not import desktop source code or depend on desktop `node_modules`.
- Website build output is `landing/dist/` and is excluded from Electron packaging.

### Shared product material

- Desktop runtime user guide: `docs/user-guide/`.
- Repository engineering docs: root `docs/`.
- Legal text bundled with desktop: `legal/`.
- Brand source assets currently remain in the desktop package because the existing synchronization script copies them to the website before desktop builds.

## Commands

Run these from the repository root:

```text
npm run build             Build desktop renderers
npm run build:all         Build desktop renderers and website
npm run test              Run deterministic desktop tests and website type checking
npm run verify            Test and build both products
npm run dev               Build and launch Electron with logging
npm run dev:web           Start website development server
npm run package:windows   Build Windows installer and portable application
```

Package-local commands remain supported for CI and release compatibility.

## Packaging policy

Electron Builder uses an explicit allowlist. Only runtime files are packaged:

- main process code;
- desktop libraries and workers;
- built renderer output;
- bundled user guide and legal documents;
- preload scripts;
- required brand assets and package metadata;
- production dependencies selected by Electron Builder.

Website source, test scripts, release scripts, repository docs, development launchers, and local artifacts are excluded from the desktop package.

## Change rules

1. Preserve both package lockfiles.
2. Add runtime packages to desktop `dependencies`; add build/test-only packages to `devDependencies`.
3. Do not remove a file based only on its name. Check static imports, dynamic paths, package scripts, Electron Builder resources, worker entry points, and documentation.
4. Run `npm run verify` after path or dependency changes.
5. Run Electron SQLite tests under Electron, not system Node, because native ABIs differ.
6. Test Windows-only behavior in a packaged build before release.

## External deployment setting

The Vercel project must use `landing` as its Root Directory and allow source imports from outside that directory. The website imports the root product logo, user-guide content, and legal text at build time.
