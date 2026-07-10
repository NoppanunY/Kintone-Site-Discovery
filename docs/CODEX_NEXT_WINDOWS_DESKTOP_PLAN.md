# Codex Next Plan - Windows Desktop MVP

This plan tracks the implementation batches after the hi-fi renderer skeleton and Windows desktop scaffold.

N6 secure credential storage is complete. For the next Codex implementation pass, plan and implement **N7 read-only kintone access** from `docs/CODEX_N7_READONLY_KINTONE_PLAN.md` before any scan runner or snapshot write work.

`docs/CODEX_N5_HARDENING_PLAN.md` remains available as completed acceptance context. Do not reuse the N5 prompt unless a review asks for a targeted N5 fix.

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
- Initial N4 Core domain package
- Initial N5 Local workspace metadata storage primitives
- N5 Local workspace metadata hardening

The N4/N5 implementation added `packages/core`, workspace package wiring, desktop workspace storage, workspace bridge APIs, metadata-backed Home/New Project/Open Project flows, app selection guards, sensitive option guards, hardened metadata validation, app-list selection persistence, open-folder allow-listing, no-secret serialization, collision-safe IDs, and tests. N6 added desktop secure credential storage through a Windows DPAPI-backed provider layer, write-only credential UI flow, and no-secret metadata tests.

Desktop runtime decision:

- Electron is accepted in `docs/adr/0001-windows-desktop-runtime.md`.
- Development command: `pnpm desktop:dev`.
- Production path: `pnpm desktop:build`, then desktop start/package work in a later batch.
- The renderer can still run in browser fallback mode, but the MVP product boundary is the Windows desktop shell.

Current hard boundary:

- No real kintone API calls yet.
- No real scan runner yet.
- No real snapshot capture yet.
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
- Run `pnpm typecheck`, `pnpm test`, `pnpm desktop:compile`, `git diff --check`, and `pnpm desktop:build` after implementation changes.
- If `pnpm desktop:build` fails only because Vite/esbuild is blocked by the sandbox with `Cannot read directory "../../.."`, rerun the same command outside the sandbox for build verification.

## Active next implementation batch

Implement only N7 read-only kintone access next. Stop before N8-N10.

N7 is required because the local metadata foundation and secure credential handling are ready, but the app still needs a read-only kintone access layer before scan orchestration can be built.

N7 focus:

- Add shared read-only kintone client abstractions in `packages/core`.
- Resolve credentials through the desktop platform layer without exposing secrets to metadata, logs, stdout, or stderr.
- Add safe domain/auth validation and fixture-first app-list fetch paths.
- Keep browser fallback unavailable/stubbed for real kintone access.
- Add tests for success/failure mapping, redacted errors, and app-list ordering preservation where applicable.
- Do not add write-back, deploy/import/sync/publish/apply/restore/rollback, scan runner, snapshot writer, report generation, packaging, or CLI behavior.

Detailed N7 task breakdown and acceptance criteria live in `docs/CODEX_N7_READONLY_KINTONE_PLAN.md`.

| Step | Status | Name | Goal |
|---|---:|---|---|
| N0 | Done | Baseline verification | Confirm the renderer and desktop scaffold build. |
| N1 | Done | Windows desktop runtime ADR | Electron selected and documented. |
| N2 | Done | Desktop shell scaffold | Existing renderer launches inside the desktop shell. |
| N3 | Done | Typed platform bridge stubs | Safe typed bridge stubs exist for future desktop operations. |
| P0 | Done | Contract and flow corrections | Initial model/route/wizard/sensitive-flow fixes are implemented. |
| N4 | Done | Core domain package | Initial shared pure TypeScript domain models, validators, constants, and safe helpers exist. |
| N5 | Done | Local workspace storage hardening | Harden metadata persistence before secure credentials and kintone reads. |
| N6 | Done | OS secure storage | Add real secure credential handling through the platform layer. |
| N7 | Next | Read-only kintone access | Add domain/auth validation and read-only API scaffolding. |
| N8 | Later | Scan runner | Add scan orchestration with fixture collectors first. |
| N9 | Later | Reports and Developer Files | Generate derived outputs from Local Snapshot. |
| N10 | Later | Windows packaging | Package the app for Windows after the core path is stable. |

## N5 hardening - local metadata safety

Status: complete. The local metadata foundation is safe, validated, and stable enough to support N6 secure credential storage and N7 read-only kintone access.

Completed scope:

- Persisted Connected Sites and Auth Profiles are available in New Project.
- Persisted metadata is schema-validated on read and write.
- UI submit paths use core validators for project names, paths, domains, and IDs.
- Project-local auth is preserved when project metadata is edited.
- Persisted app-list metadata hydrates app counts and selected app state.
- `openLocalFolder` is allow-listed to app/project paths.
- Desktop storage uses shared deterministic/no-secret serialization.
- Project/site/auth local IDs avoid collisions.
- Empty desktop metadata does not masquerade as sample/mock projects.

Acceptance:

- Persisted sites/auth profiles are available in New Project.
- Invalid metadata is reported as recoverable and never silently treated as valid.
- Project-local auth cannot be accidentally converted to global auth by editing project metadata.
- Persisted app-list metadata hydrates app counts and selected app state.
- `openLocalFolder` rejects arbitrary absolute paths outside known app/project roots.
- ID generation avoids collisions for duplicate project/site/auth names.
- Desktop storage uses shared core no-secret serialization checks.
- Empty desktop metadata does not masquerade as sample/mock projects.
- `pnpm typecheck`, `pnpm test`, `pnpm desktop:compile`, `git diff --check`, and `pnpm desktop:build` pass or have documented environment-only failures.

## N6 secure credential storage

Status: complete. Secure credential handling is available through the desktop platform layer and is ready to support N7 read-only kintone access.

Completed scope:

- Added `desktop/credentialStore.cts` as the secure credential provider abstraction.
- Added a Windows DPAPI-backed provider that writes encrypted credential records under app data.
- Added bridge APIs for credential store status, store, and forget.
- Updated write-only auth UI paths so passwords are passed once to the desktop bridge and then cleared.
- Kept project/app metadata limited to credential status and opaque keychain references.
- Preserved browser fallback as unavailable for secure credential storage.
- Added tests proving credential records do not contain raw fixture credentials and metadata stores only refs/status.

Acceptance:

- Add Auth Profile stores a password through the desktop credential provider before marking metadata as saved.
- Project-local auth can store a password through the desktop credential provider before project metadata is created.
- Edit Auth Profile can replace a password through the desktop credential provider.
- Metadata files do not serialize raw credential values.
- Credential store status, store, forget, and credential-status transitions are covered by tests.

## Later steps after N6 review

N6 has been completed and verified locally. Next steps:

- N7: Add read-only kintone client scaffolding and real connection/app-list tests.
- N8: Add scan runner with fixture collectors first.
- N9: Generate Reports and Developer Files from snapshots only.
- N10: Add Windows packaging.

## Codex report format

When done with N7 read-only kintone access, report:

1. Files created/changed.
2. Read-only client abstractions and credential-resolution behavior.
3. Domain/auth validation behavior.
4. App-list fetch behavior and fixture coverage.
5. Redaction/no-secret behavior for errors/logs/stdout/stderr.
6. Browser fallback behavior.
7. Tests added/updated and command results.
8. Verification command results.
9. What remains before scan runner, snapshots, reports, CLI behavior, and packaging.
