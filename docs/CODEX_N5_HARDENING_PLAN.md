# Codex N5 Hardening Plan

Status: complete as of the N5 closing commit. Keep this file as acceptance context and use it only for targeted review fixes.

This was the active follow-up plan after the first N4/N5 metadata foundation implementation landed on `develop`.

Read this file before starting the next Codex pass. The goal is to harden the local metadata foundation so it is safe to build N6 secure credentials and N7 read-only kintone access on top of it.

## Current status

The current `develop` branch now has:

- `packages/core` with canonical domain types, capture constants, validators, scan helpers, picker helpers, and safe serialization helpers.
- Workspace package wiring for `packages/*`.
- Desktop metadata storage in `desktop/workspaceStorage.cts`.
- Desktop bridge APIs for workspace home, project creation/opening, site/auth/project metadata updates, removals, and window/tab state.
- Home/New Project/Open Project flows partially bound to local metadata.
- App selection and sensitive option guards still using sample app data.
- Tests for core helpers and workspace storage basics.

This is real progress, but it is not ready for N6/N7 yet. The next pass must be **N5 hardening only**.

## Hard boundaries

Do not implement:

- real kintone API calls,
- real login/session handling,
- real scan runner,
- real snapshot capture,
- real reports/developer-file generation,
- OS secure credential storage,
- CLI command behavior,
- deploy/import/write-back/sync/push/publish/apply/restore/rollback,
- Git client features,
- AI/chat/analysis features,
- Windows installer/packaging.

Keep the app honest: scan/snapshot/report/developer-file screens remain mock/sample-data surfaces until N7-N9. Any UI copy that mentions scan activity must continue to say no real kintone request or snapshot write happened.

## Source files to inspect first

Read these before coding:

1. `docs/CODEX_IMPLEMENTATION_HANDOFF.md`
2. `docs/CODEX_N5_HARDENING_PLAN.md`
3. `docs/CODEX_N4_N5_IMPLEMENTATION_PLAN.md`
4. `docs/CODEX_NEXT_WINDOWS_DESKTOP_PLAN.md`
5. `docs/ui-handoff/DATA_CONTRACT.md`
6. `docs/ui-handoff/SNAPSHOT_STORAGE_SPEC.md`
7. `docs/ui-handoff/ROUTING_SPEC.md`
8. `packages/core/src/*`
9. `desktop/workspaceStorage.cts`
10. `desktop/main.cts`
11. `src/App.tsx`
12. `src/screens/onboarding/OnboardingScreen.tsx`
13. `src/screens/ProjectHomeScreen.tsx`
14. `src/appPickerData.ts`

## Implementation order

### H0 - Baseline

Before changing implementation files:

1. Confirm the branch is `develop`.
2. Do not reset or rebase `develop`.
3. Run, if the environment allows:
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm desktop:compile`
   - `git diff --check`
   - `pnpm desktop:build`
4. If `pnpm desktop:build` fails only because Vite/esbuild is blocked by the sandbox with `Cannot read directory "../../.."`, record it and rerun outside the sandbox.

### H1 - Use persisted Sites/Auth Profiles in onboarding

Problem: Home uses persisted `ConnectedSite` / `AuthProfile` metadata, but the New Project wizard still builds site/auth dropdowns from mock data.

Implement:

- Pass persisted connected sites and auth profiles from `App.tsx` into `OnboardingScreen`.
- `OnboardingScreen` should use persisted metadata first, with mock fallback only when no persisted metadata exists.
- The `Add connected site` flow should save metadata, then New Project should be able to select the newly added site.
- The `Add auth profile` flow should save metadata, then New Project should be able to select the newly added auth profile.
- `initialSiteId` should resolve against persisted sites as well as mock fallback.
- Keep project-local auth as project-only; it must never be appended to global Auth profiles.

Acceptance:

- Create/Add Site -> return Home -> New Project shows the new site in the site dropdown.
- Create/Add Auth Profile -> return Home -> New Project shows the new auth profile in the auth dropdown.
- No password is stored in persisted metadata.

### H2 - Validate metadata schemas on read and write

Problem: `readJson<T>()` currently parses JSON and casts to `T`. Valid JSON with an invalid shape can silently become app state.

Implement validation for every persisted metadata file:

- `project.json` -> `validateProject`
- `connected-site.json` -> `validateConnectedSite`
- `connected-sites.json` -> validate array item with `validateConnectedSite`
- `auth-profiles.json` -> validate array item with `validateAuthProfile`
- `app-list.json` -> validate `schemaVersion`, `appListFetchedAt`, and each `AppSummary` with `validateAppSummary`
- `app-index.json` -> validate `schemaVersion` and each recent project entry
- `current.json` -> validate basic current pointer shape
- `history.json` -> validate basic schema version and `runs` array
- `window-state.json` -> validate tab array and active tab shape

Rules:

- Invalid but parseable JSON should return a recoverable `WorkspaceMetadataIssue` with `code: "invalid_metadata"`.
- Missing required project files should remain recoverable, not crash the renderer.
- Do not throw for user-recoverable metadata problems.
- Do not write invalid metadata: storage write APIs should validate inputs before writing.

Acceptance:

- Tests cover corrupt JSON and parseable-but-invalid JSON separately.
- Invalid project metadata does not appear as a valid project in Home.
- Invalid app-level site/auth entries are skipped or reported without crashing the renderer.

### H3 - Use core validators in UI before submitting metadata

Problem: UI currently checks mostly non-empty strings. It should use core validators for domain, path, and metadata drafts.

Implement:

- Project name validation with `validateProjectName`.
- kintone domain validation with `validateKintoneDomain`.
- project folder validation with `validateWindowsSafeLocalPath` where appropriate.
- local ID validation where users select existing IDs.
- user-facing inline validation messages in Onboarding and metadata edit modals.
- storage validation remains the source of truth even if UI validation is present.

Acceptance:

- Site domain rejects protocol/path/port/credentials before save.
- Project folder rejects unsafe Windows paths before create.
- Project name rejects Windows-reserved names and unsafe characters.
- Auth profile save requires display name and username, and never serializes password fields.

### H4 - Preserve project-local auth when editing project metadata

Problem: The project edit flow currently saves `authSelection` as `global_profile` only. A project using `project_local` auth can accidentally be converted to a global profile by editing metadata.

Implement one of these safe options:

Option A, preferred:

- Metadata edit modal supports both auth modes.
- Existing project-local auth stays project-local unless the user explicitly switches to a global auth profile.
- If project-local auth is edited, store only metadata: display name, username, authType, credentialStatus, optional future `keychainRef`.

Option B, acceptable for this hardening pass:

- If a project uses project-local auth, make the auth section read-only in the edit modal and only allow name/site changes.
- Do not convert project-local auth to global auth implicitly.

Acceptance:

- Test or manual route proves editing project name/site does not change `authSelection.kind` from `project_local` to `global_profile`.

### H5 - Persist and hydrate app-list / selected app state

Problem: `app-list.json` is written during project creation, but `WorkspaceHomeSnapshot` and the UI do not hydrate app counts/selection from persisted project metadata. Persisted projects can reopen with zero selected apps even when an app list was written.

Implement:

- Extend workspace storage read/open results so project app summaries are accessible to the renderer.
- Either add a `projectAppListsByProjectId` map to `WorkspaceHomeSnapshot`, or add a project summary field with app count and selected app IDs.
- Hydrate `selectedAppIdsByProject` when loading workspace home or opening a project folder.
- Use persisted app summaries for the Apps screen when available; sample app data remains fallback only.
- Keep copy clear: app list is sample/metadata-only until N7 real app fetching.

Rules:

- Do not implement kintone app fetching in this hardening pass.
- Do not write real snapshots.

Acceptance:

- Create project with “all apps” selected -> restart/reopen -> Apps screen shows the same selected count.
- Create project with “choose later” -> scan run remains blocked until apps are selected.
- App counts in Home/Overview reflect persisted app-list metadata rather than always zero.

### H6 - Restrict `openLocalFolder` to allowed local paths

Problem: the desktop main process currently opens any absolute path that the renderer passes. It should be a narrow platform action, not an arbitrary shell-open capability.

Implement an allow-list strategy:

- Open paths under known project folders in `app-index.json`.
- Open paths under the app data root.
- Open known generated subfolders under a project folder, such as `snapshots`, `reports`, `developer-files`, `.kintone`, or `.app`, when those paths are derived by the main process or validated against the project folder.
- Optionally support a short-lived token for the exact folder chosen via a native dialog, if needed.

Reject:

- arbitrary absolute paths not associated with app metadata,
- paths with traversal outside allowed roots,
- paths that do not exist,
- file paths when a folder is expected.

Acceptance:

- Tests cover allowed project path, allowed appDataRoot path, and rejected arbitrary absolute path.
- Renderer still cannot call generic filesystem APIs.

### H7 - Reuse core serialization/no-secret checks in desktop storage

Problem: core has `findSecretReferences`, `assertNoSecretReferences`, and deterministic serialization. Desktop storage currently has a separate secret-key-only check and its own JSON stringifier.

Implement:

- Use core `stringifyDeterministic` and `assertNoSecretReferences` in `desktop/workspaceStorage.cts`.
- Remove or reduce duplicate local secret/key sorting helpers.
- Ensure storage rejects secret-looking keys and secret-looking values.

Acceptance:

- Existing no-secret tests still pass.
- New tests cover secret-looking values, not only secret-looking keys.

### H8 - Make local IDs collision-safe

Problem: Project/site/auth IDs are slug-derived and can collide when users create same-named items in different folders or add duplicate names.

Implement:

- Add a core helper for collision-safe local IDs, or compose ID from slug + short timestamp/random suffix.
- Storage should check existing app-index/sites/auth profiles before accepting a new ID.
- If an imported/opened project ID collides with an existing project at a different folder, return a recoverable conflict instead of silently overwriting app-index entries.

Acceptance:

- Creating two projects with the same name in different folders does not overwrite the first Home entry.
- Adding two connected sites with the same display name but different domains does not overwrite the first site metadata.
- Adding two auth profiles with the same display name does not overwrite the first profile metadata.

### H9 - Clean up mock fallback boundaries

Problem: sample app data and mock profiles/sites are still useful fallback data, but they should not masquerade as persisted metadata once workspace home has loaded.

Implement:

- Make fallback state explicit: `workspaceMode: "loading" | "desktop_metadata" | "browser_fallback" | "empty"` or equivalent.
- If the desktop metadata store is empty, show empty Home state rather than silently reusing mock projects.
- Browser fallback may still show preview/sample data, but it must be labeled as browser fallback / preview only.
- Scan/snapshot/report/history mock data should remain visually honest and not look like a persisted scan result for new projects.

Acceptance:

- Empty desktop metadata -> Home shows no projects, not mock projects.
- Browser fallback -> clear warning/copy that metadata persistence is unavailable.

## Tests to add or update

Add tests where practical:

Core tests:

- metadata schema validators for app index, current pointer, history, window state if added,
- collision-safe ID helper,
- secret-looking value detection.

Desktop storage tests:

- parseable invalid metadata is recoverable and not loaded as valid,
- create duplicate project names in different folders without collision,
- add duplicate site/auth display names without collision,
- persisted app-list hydrates project/app counts,
- open-folder allow-list accepts known project/appData paths and rejects arbitrary paths,
- project-local auth remains project-local when project metadata changes,
- storage uses core no-secret serialization for keys and values.

Renderer-focused checks, if no test runner is added:

- New Project dropdowns use persisted connected sites/auth profiles,
- app selection survives restart/open project,
- edit project does not force project-local auth into a global profile,
- empty desktop metadata does not show mock projects.

## Verification commands

Run before final report:

- `pnpm typecheck`
- `pnpm test`
- `pnpm desktop:compile`
- `git diff --check`
- `pnpm desktop:build`

Record exact results. If a command cannot run in the sandbox, record the reason and the result from outside the sandbox if available.

## Required Codex final report

When finished, report:

1. Files created/changed.
2. Metadata validation changes.
3. Onboarding persisted site/auth changes.
4. App-list hydration and app selection persistence changes.
5. Project-local auth edit behavior.
6. Open-folder allow-list behavior.
7. ID collision strategy.
8. No-secret serialization changes.
9. Tests added/updated and command results.
10. Verification command results.
11. What remains before N6 OS secure credential storage and N7 read-only kintone access.

## Exit criteria before N6/N7

Do not proceed to N6 or N7 until all of these are true:

- Persisted metadata is schema-validated on read and write.
- Onboarding uses persisted connected sites/auth profiles.
- Project-local auth cannot be accidentally converted to global auth by editing project metadata.
- Persisted app-list metadata hydrates app counts and selected app state.
- `openLocalFolder` is allow-listed.
- ID generation is collision-safe.
- Storage uses core no-secret serialization.
- `pnpm typecheck`, `pnpm test`, `pnpm desktop:compile`, `git diff --check`, and `pnpm desktop:build` pass or have documented environment-only failures.
