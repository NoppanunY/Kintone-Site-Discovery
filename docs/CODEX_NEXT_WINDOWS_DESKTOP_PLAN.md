# Codex Next Plan - Windows Desktop MVP

This plan tracks the implementation batches after the hi-fi renderer skeleton and Windows desktop scaffold.

N5 hardening is complete. For the next Codex implementation pass, plan and implement **N6 OS secure credential storage** before any read-only kintone access work.

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

The N4/N5 implementation added `packages/core`, workspace package wiring, desktop workspace storage, workspace bridge APIs, metadata-backed Home/New Project/Open Project flows, app selection guards, sensitive option guards, hardened metadata validation, app-list selection persistence, open-folder allow-listing, no-secret serialization, collision-safe IDs, and tests.

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
- Run `pnpm typecheck`, `pnpm test`, `pnpm desktop:compile`, `git diff --check`, and `pnpm desktop:build` after implementation changes.
- If `pnpm desktop:build` fails only because Vite/esbuild is blocked by the sandbox with `Cannot read directory "../../.."`, rerun the same command outside the sandbox for build verification.

## Active next implementation batch

Implement only N6 OS secure credential storage next. Stop before N7-N10.

N6 is required because the local metadata foundation is ready, but passwords still need a real secure credential provider before read-only kintone access can be built on top of it.

N6 focus:

- Add a desktop credential provider abstraction.
- Store passwords only through the secure provider, never in project/app metadata.
- Keep metadata limited to credential status and opaque keychain references.
- Wire add/update auth flows to write-only credential handling.
- Preserve browser fallback as unavailable/stubbed for secure storage.
- Add tests for no-secret metadata serialization and credential-status transitions.

| Step | Status | Name | Goal |
|---|---:|---|---|
| N0 | Done | Baseline verification | Confirm the renderer and desktop scaffold build. |
| N1 | Done | Windows desktop runtime ADR | Electron selected and documented. |
| N2 | Done | Desktop shell scaffold | Existing renderer launches inside the desktop shell. |
| N3 | Done | Typed platform bridge stubs | Safe typed bridge stubs exist for future desktop operations. |
| P0 | Done | Contract and flow corrections | Initial model/route/wizard/sensitive-flow fixes are implemented. |
| N4 | Done | Core domain package | Initial shared pure TypeScript domain models, validators, constants, and safe helpers exist. |
| N5 | Done | Local workspace storage hardening | Harden metadata persistence before secure credentials and kintone reads. |
| N6 | Next | OS secure storage | Add real secure credential handling through the platform layer. |
| N7 | Later | Read-only kintone access | Add domain/auth validation and read-only API scaffolding. |
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

## Later steps after N5 hardening review

N5 has been completed and reviewed by local/manual checks. Next steps:

- N6: Implement OS secure storage through the platform layer.
- N7: Add read-only kintone client scaffolding and real connection/app-list tests.
- N8: Add scan runner with fixture collectors first.
- N9: Generate Reports and Developer Files from snapshots only.
- N10: Add Windows packaging.

## Codex report format

When done with N5 hardening, report:

1. Files created/changed.
2. Metadata validation changes.
3. Onboarding persisted site/auth changes.
4. App-list hydration and selected-app persistence changes.
5. Project-local auth edit behavior.
6. Open-folder allow-list behavior.
7. ID collision strategy.
8. No-secret serialization changes.
9. Tests added/updated and command results.
10. Verification command results.
11. What remains before N6 OS secure credentials and N7 read-only kintone access.
