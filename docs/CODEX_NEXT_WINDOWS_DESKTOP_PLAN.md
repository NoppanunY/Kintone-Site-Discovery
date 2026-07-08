# Codex Next Plan - Windows Desktop MVP

This plan tracks the implementation batches after the hi-fi renderer skeleton and Windows desktop scaffold.

For the next Codex implementation pass, read `docs/CODEX_N4_N5_IMPLEMENTATION_PLAN.md` first. That file is the active checklist for N4-N5 and includes the P0 contract/flow corrections that must happen before local metadata persistence is allowed to become the app's source of truth.

The product is a **Windows desktop app**. The React/Vite UI is the renderer, not the final product boundary. The app must run locally on Windows, keep local project data on the user's machine, and read from kintone without writing anything back.

## Current state

The `develop` branch has completed:

- T0 Design tokens
- T1 Component library
- T2 App shell
- T3 Routing
- T4 Onboarding and mock UI screens
- N0 Baseline verification
- N1 Windows desktop runtime ADR
- N2 Desktop shell scaffold
- N3 Typed platform bridge stubs
- UI consistency pass for Project / Connected Site / Auth Profile terminology

Desktop runtime decision:

- Electron is accepted in `docs/adr/0001-windows-desktop-runtime.md`.
- Development command: `pnpm desktop:dev`.
- Production path: `pnpm desktop:build`, then desktop start/package work in a later batch.
- The renderer can still run in browser fallback mode, but the MVP product boundary is the Windows desktop shell.

Current hard boundary:

- No real kintone API calls yet.
- No real scan runner yet.
- No real snapshot capture yet.
- No real OS secure credential storage yet.
- No real CLI behavior yet.
- No deploy, import, write-back, Git client, AI, rollback, or safe deploy flow.

## Product model for the next phase

```text
Connected Site + Project Auth -> Project Folder -> Local Snapshot -> Reports / Developer Files / Review Package
```

Definitions for the next phase:

- `ConnectedSite` is an app-level reusable kintone target: display name and domain. It does **not** own auth.
- `AuthProfile` is an app-level reusable credential identity. It contains metadata and a future secure credential reference, never the secret.
- `Project` is one local folder/workspace that selects exactly one `ConnectedSite` and an `authSelection` (global profile or project-local auth metadata; never a secret).
- Multiple Projects may reference the same ConnectedSite/domain.
- A Project tab is the active desktop tab context. Page copy may show the linked site, but scan/snapshot/report/history state belongs to the Project.
- Older specs may still say `SiteWorkspace`; for current desktop work, interpret that as "Project plus its linked ConnectedSite" unless a file explicitly says otherwise.

## Branch rules

- Work on `develop`.
- Do not reset `develop`.
- Do not create temporary branches unless asked.
- Use Conventional Commits.
- Keep changes small and reviewable.
- Run `pnpm typecheck`, `pnpm desktop:compile`, `git diff --check`, and `pnpm desktop:build` after implementation changes.
- If `pnpm desktop:build` fails only because Vite/esbuild is blocked by the sandbox with `Cannot read directory "../../.."`, rerun the same command outside the sandbox for build verification.

## Active next implementation batch

Implement only the P0 corrections listed below plus N4 and N5 next. Stop before N6-N10.

P0 corrections are part of the N4-N5 batch because they prevent unsafe persistence of the wrong model shape:

- Align renderer data models with `docs/ui-handoff/DATA_CONTRACT.md` before writing project metadata to disk.
- Replace UI-label status unions with canonical snake_case status values plus label maps.
- Replace scan preset id `full` with canonical `full_discovery`.
- Replace project `authProfileId`-only assumptions with `Project.authSelection`.
- Make sensitive confirmation state-derived and route-guarded.
- Add onboarding step validation and block Apps until the mocked connection test has passed.
- Add scan route guards for selected apps and sensitive confirmation.
- Fix nested interactive controls in the tab bar before treating it as production shell behavior.

| Step | Status | Name | Goal |
|---|---:|---|---|
| N0 | Done | Baseline verification | Confirm the renderer and desktop scaffold build. |
| N1 | Done | Windows desktop runtime ADR | Electron selected and documented. |
| N2 | Done | Desktop shell scaffold | Existing renderer launches inside the desktop shell. |
| N3 | Done | Typed platform bridge stubs | Safe typed bridge stubs exist for future desktop operations. |
| P0 | Next | Contract and flow corrections | Fix model/route/wizard/sensitive-flow issues before persistence. |
| N4 | Next | Core domain package | Add shared pure TypeScript domain models, validators, constants, and safe helpers. |
| N5 | Next | Local workspace storage | Add project/connected-site/auth-profile metadata persistence and project-folder primitives. |
| N6 | Later | OS secure storage | Add real secure credential handling through the platform layer. |
| N7 | Later | Read-only kintone access | Add domain/auth validation and read-only API scaffolding. |
| N8 | Later | Scan runner | Add scan orchestration with fixture collectors first. |
| N9 | Later | Reports and Developer Files | Generate derived outputs from Local Snapshot. |
| N10 | Later | Windows packaging | Package the app for Windows after the core path is stable. |

## N4 - Core domain package

Goal: create the shared pure TypeScript foundation that both desktop UI and future CLI can use.

Recommended scope:

- Add `packages/core` and update workspace config so `packages/*` is included.
- Move or mirror canonical domain types from `docs/ui-handoff/DATA_CONTRACT.md`.
- Define constants for capture presets and category tiers.
- Add pure validators and normalizers for:
  - kintone domain strings,
  - project names,
  - Windows-safe local paths,
  - local IDs,
  - app selection state,
  - Project / ConnectedSite / AuthProfile / authSelection metadata.
- Add result/error shapes that match the UI state matrix.
- Add deterministic JSON serialization helpers where useful.
- Add no-secret serialization checks/helpers.

Rules:

- Pure TypeScript only.
- No filesystem writes.
- No Electron, Node privileged APIs, browser globals, kintone calls, scan runner, or keychain access.
- No CLI command behavior.
- No deploy/import/write-back verbs.

Acceptance:

- `packages/core` exports stable typed interfaces and pure helpers.
- Renderer can import types/helpers without pulling in Node-only code.
- Renderer uses canonical enum values for persistable state.
- UI labels are derived through mapping/copy helpers rather than stored as data values.
- TypeScript passes.
- Unit tests or focused type/runtime checks cover validators, sensitive-option derivation, no-secret serialization, and preset/category defaults if a test runner is added in this batch.

## N5 - Local workspace storage

Goal: introduce real local metadata persistence without connecting to kintone or writing scan snapshots.

Recommended scope:

- Add an app-level metadata store under the desktop app data directory for:
  - recent projects,
  - connected sites,
  - auth profile metadata without secrets,
  - window/tab state.
- Add project-folder primitives for one-site-per-project storage:
  - create/open/validate Project folder,
  - write/read `project.json`,
  - write/read selected ConnectedSite metadata cache,
  - initialize `app-list.json`, `current.json`, `history.json`, `snapshots/`, `.app/`, and `.kintone/` placeholders as needed.
- Extend the typed platform bridge narrowly for workspace operations. Renderer code must not gain unrestricted filesystem access.
- Wire folder picker/open-folder through the platform bridge.
- Use atomic JSON writes (temp file + rename).
- Use Windows-safe path handling and clear user-facing errors.

Rules:

- No real credential storage. Auth profile files may contain only metadata and future keychain references, never secrets.
- No kintone API calls.
- No app list fetching from kintone.
- No scan runner.
- No snapshot capture or report/developer-file generation yet.
- No CLI behavior.

Acceptance:

- Desktop can create/open a mock Project folder and persist metadata locally.
- Home can be backed by persisted Projects / ConnectedSites / AuthProfiles, while still using mock app/snapshot data for scan screens.
- Open project tabs and active tab state can persist across restart.
- Corrupt/missing project metadata shows recoverable errors; it does not crash the renderer.
- Secret-like values are never written to app-level or project-level metadata files.
- `pnpm typecheck`, `pnpm desktop:compile`, `git diff --check`, and `pnpm desktop:build` pass.

## Later steps after N4-N5 review

Do not start these until N4-N5 are reviewed:

- N6: Implement OS secure storage through the platform layer.
- N7: Add read-only kintone client scaffolding and real connection/app-list tests.
- N8: Add scan runner with fixture collectors first.
- N9: Generate Reports and Developer Files from snapshots only.
- N10: Add Windows packaging.

## Codex report format

When done with the next batch, report:

1. Files created/changed.
2. Core package APIs added.
3. Renderer model drift fixes made.
4. Workspace storage files and locations.
5. Platform bridge APIs added.
6. Route guard and sensitive-flow behavior changed.
7. Onboarding validation behavior changed.
8. Commands run and results.
9. Desktop dev/build commands.
10. What remains before OS credentials, local snapshot writes, and kintone reads.
11. Any Windows-specific risks or questions.
