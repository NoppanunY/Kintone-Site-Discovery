# Codex Next Plan — Windows Desktop MVP

This is the next implementation plan after the Hi-Fi UI screens are complete.

The product is a **Windows desktop app**. The current React/Vite UI is the renderer, not the final product boundary. The MVP must run locally on Windows, keep local project data on the user's machine, and read from kintone without writing anything back.

## Current state

The `develop` branch has the first UI skeleton batch:

- T0 Design tokens
- T1 Component library
- T2 App shell
- T3 Routing
- T4 Onboarding and mock UI screens

Current hard boundary:

- No real kintone API calls yet.
- No real scan runner yet.
- No real snapshot storage yet.
- No real OS secure storage yet.
- No real CLI behavior yet.
- No deploy, import, write-back, Git client, AI, rollback, or safe deploy flow.

## Product model

```text
Pull from kintone -> Local Snapshot -> Reports / Developer Files / Review Package
```

The Local Snapshot is the canonical output. Reports and Developer Files are generated from it.

## Branch rules

- Work on `develop`.
- Do not reset `develop`.
- Do not create temporary branches unless asked.
- Use Conventional Commits.
- Keep changes small and reviewable.
- Run `pnpm typecheck` and `pnpm build` after implementation changes.

## Next implementation batch

Implement only N0-N3 first.

| Step | Name | Goal |
|---|---|---|
| N0 | Baseline verification | Confirm the current renderer builds. |
| N1 | Windows desktop runtime ADR | Decide and document the desktop shell approach. |
| N2 | Desktop shell scaffold | Launch the existing renderer inside a Windows desktop shell. |
| N3 | Typed platform bridge stubs | Add safe typed bridge APIs for future desktop operations. |
| N4 | Core domain package | Add shared pure TypeScript domain models and services. |
| N5 | Local workspace storage | Add project/site settings and snapshot folder primitives. |
| N6 | OS secure storage | Add secure local credential handling through an abstraction. |
| N7 | Read-only kintone access | Add domain/auth validation and read-only API scaffolding. |
| N8 | Scan runner | Add scan orchestration with fixture collectors first. |
| N9 | Reports and Developer Files | Generate derived outputs from Local Snapshot. |
| N10 | Windows packaging | Package the app for Windows after the core path is stable. |

## N0 — Baseline verification

Run:

```bash
pnpm typecheck
pnpm build
```

Acceptance:

- TypeScript passes.
- Build passes.
- Current mock UI still renders.

## N1 — Windows desktop runtime ADR

Create:

```text
docs/adr/ADR-0001-windows-desktop-runtime.md
```

The ADR must state:

- MVP target is Windows desktop.
- React/Vite is the renderer.
- The shipped app must run as a local desktop app, not a hosted web app.
- Renderer code must not directly access native desktop capabilities.
- Native/platform operations must go through a typed bridge.
- Local Snapshot data is stored in user-selected local folders with Windows-safe path handling.

Recommended decision for this repo:

- Prefer Electron for the next batch because the current app is already React/Vite and Electron is the shortest path to a Windows desktop shell.
- Tauri is acceptable only if the ADR explains the added native/Rust impact and bridge design.

Do not implement both.

## N2 — Desktop shell scaffold

Add the desktop runtime around the existing renderer.

Requirements:

- Launch as a Windows desktop window.
- Preserve the Hi-Fi app frame size target: 1240px by 800px.
- Define a minimum usable window size.
- Development mode may load Vite localhost.
- Production mode must load built local assets.
- Do not add real kintone, scan, snapshot, or secure-storage behavior yet.

If using Electron:

- Use context isolation.
- Do not enable direct Node access in React components.
- Use a preload bridge with a small typed API.
- Open external links through the desktop shell.

Acceptance:

- A desktop dev command exists, for example `pnpm desktop:dev`.
- A production desktop build path is documented.
- The existing UI skeleton renders inside the desktop window.
- `pnpm typecheck` and `pnpm build` pass.

## N3 — Typed platform bridge stubs

Add a narrow typed API for future desktop operations. Use stubs/mocks where real behavior is not ready.

Suggested API groups:

- `app.getVersion()`
- `app.getPlatform()`
- `dialog.chooseFolder()`
- `shell.openExternal(url)`
- `shell.openPath(path)`
- `filesystem` stubs for later workspace/snapshot operations
- `secureStore` stubs for later credential operations
- `logging` stubs for safe application logs

Rules:

- React components call the typed bridge only through a small client module.
- Do not expose unrestricted filesystem access to the renderer.
- Do not expose command execution to the renderer.
- Return safe user-facing errors.

Acceptance:

- Bridge types exist.
- Renderer can call safe stub methods without crashing.
- No real kintone or snapshot write behavior is added.

## Later steps after review

Do not start these until N0-N3 are reviewed:

- N4: Create `packages/core` for pure domain logic and shared types.
- N5: Add local workspace and append-only snapshot storage.
- N6: Add OS secure storage through the platform layer.
- N7: Add read-only kintone client scaffolding.
- N8: Add scan runner with fixture collectors first.
- N9: Generate Reports and Developer Files from snapshots only.
- N10: Add Windows packaging.

## Codex report format

When done, report:

1. Runtime choice and ADR path.
2. Files created/changed.
3. Commands run and results.
4. Desktop dev command.
5. Production desktop loading/build plan.
6. Bridge APIs added.
7. What remains before local snapshot and kintone logic.
8. Any Windows-specific questions or risks.
