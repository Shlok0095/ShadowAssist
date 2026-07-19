# Production readiness notes

Last reviewed: 2026-07-19

## Enforced gates

The repository root now provides:

```text
npm run test
npm run build
npm run verify
```

`npm run test` executes deterministic desktop coverage and the website TypeScript compiler. CI runs the same desktop suite, website type check, and both production builds.

Electron-native persistence checks remain package-local because they must run with Electron's ABI:

```text
npm run test:persistent-memory
npm run test:electron-sqlite
```

Windows package smoke:

```text
npm run dist:dir
```

## Cleanup policy

Files were removed only when no application import, Vite route, package script, runtime path, worker constructor, packaging rule, test, or documentation reference remained.

The cleanup removed:

- obsolete one-time migration and duplicate postbuild scripts;
- removed-OCR and duplicated capture-profile helpers;
- an unused response-state helper;
- an unreachable legacy website component/hook/UI subtree.

No npm dependency was removed. Every direct desktop and website dependency has a verified source, build, dynamic runtime, native, or packaging consumer.

Generated and local-only directories remain ignored:

- `node_modules/`;
- desktop `out/`, `dist/`, and generated `build/` assets (except tracked `build/update-channel.txt`);
- website `dist/`;
- local test/model caches;
- `.vercel/`;
- `_quarantine/`.

## Packaging boundary

Electron Builder now uses an explicit source allowlist. The packaged desktop application excludes:

- website source;
- tests and release scripts;
- repository engineering documentation;
- development launchers;
- local build and cache artifacts.

The allowlist was validated with a successful unpacked Windows package.

## Release corrections

The Windows release workflow now:

1. creates the stable rolling installer copy before checksums;
2. includes both stable and versioned installer names in rolling releases;
3. publishes the versioned installer referenced by `latest.yml`;
4. generates checksums for every published executable name.

Website download routing now separates channels:

- `/download`, `/download/portable`, and `/download/checksums` use `latest`;
- `/download/beta` uses `latest-stag`.

GitHub Pages builds direct download actions through the Vercel site so Pages does not depend on unsupported redirect rules.

## Deferred breaking upgrades

Non-breaking lockfile audit updates were applied. Remaining audit findings require major-version upgrades:

- Electron 34 to a currently supported Electron major;
- Vite 5 to a current Vite major;
- Electron Builder 24 to a current major.

These were not force-upgraded during structural cleanup because Electron changes Chromium/Node/native ABI behavior, while Vite and Electron Builder have build and packaging migrations. Upgrade each in a dedicated branch with:

- clean dependency installation;
- full deterministic suite;
- Electron SQLite tests;
- both builds;
- unpacked and installer packaging;
- packaged launch and native Windows checks.

## Package roots

The Electron package is the repository root. The website is the independent `landing/` package. Vercel must be configured with `landing` as its Root Directory and with imports from outside that directory enabled.
