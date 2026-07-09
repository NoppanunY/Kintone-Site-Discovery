# Codex Prompt - N5 Hardening

Use this prompt to start the next Codex implementation pass.

```text
You are working on `NoppanunY/Kintone-Site-Discovery` on branch `develop`.

Start the next implementation phase: N5 hardening only.

Before editing code, read these files in this order:

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

Follow `docs/CODEX_N5_HARDENING_PLAN.md` as the source of truth.

Hard boundaries:

- Do not implement real kintone API calls.
- Do not implement real login/session handling.
- Do not implement a real scan runner.
- Do not write real snapshots.
- Do not generate real reports/developer files.
- Do not implement OS secure credential storage.
- Do not implement CLI command behavior.
- Do not implement deploy/import/write-back/sync/push/publish/apply/restore/rollback.
- Do not add Git client, AI/chat/analysis, or Windows packaging.
- Keep scan/snapshot/report/developer-file screens mock/sample-only and explicit that no kintone request or snapshot write happened.
- Never persist passwords, tokens, cookies, authorization headers, session values, private keys, or raw kintone responses.

Implementation order:

0. Baseline:
   - Confirm branch is `develop`.
   - Do not reset or rebase `develop`.
   - Run if possible:
     - `pnpm typecheck`
     - `pnpm test`
     - `pnpm desktop:compile`
     - `git diff --check`
     - `pnpm desktop:build`

1. Onboarding metadata source:
   - Pass persisted `ConnectedSite[]` and `AuthProfile[]` from `App.tsx` into `OnboardingScreen`.
   - New Project site/auth dropdowns must use persisted metadata first.
   - Mock lists are fallback only when no persisted metadata exists or in labeled browser fallback mode.
   - Add Site -> New Project must show the newly saved site.
   - Add Auth Profile -> New Project must show the newly saved auth profile.
   - Project-local auth must remain project-only and never be appended to global Auth profiles.

2. Metadata schema validation:
   - Stop treating `JSON.parse(raw) as T` as valid app state.
   - Validate every persisted metadata file on read and write:
     - `project.json` -> `validateProject`
     - `connected-site.json` -> `validateConnectedSite`
     - `connected-sites.json` -> validate each `ConnectedSite`
     - `auth-profiles.json` -> validate each `AuthProfile`
     - `app-list.json` -> validate schema version, timestamp/null, and each `AppSummary`
     - `app-index.json` -> validate schema version and recent project entries
     - `current.json` -> validate current pointer shape
     - `history.json` -> validate schema version and runs array
     - `window-state.json` -> validate tab array and active tab shape
   - Parseable but invalid JSON should produce recoverable `WorkspaceMetadataIssue` with `code: "invalid_metadata"`.
   - Invalid project metadata must not appear as a valid project in Home.

3. UI validators:
   - Use core validators in Onboarding and metadata edit modals:
     - `validateProjectName`
     - `validateKintoneDomain`
     - `validateWindowsSafeLocalPath`
     - local ID validation where relevant
   - Show inline user-facing validation messages.
   - Storage validation remains the source of truth even with UI validation.

4. Project-local auth preservation:
   - Editing a project must not silently convert `authSelection.kind` from `project_local` to `global_profile`.
   - Preferred: metadata edit modal supports both global profile and project-local auth modes.
   - Acceptable: if project uses project-local auth, make auth read-only and allow only name/site changes.

5. App-list and selected-app hydration:
   - `app-list.json` is already written; now hydrate it back into renderer state.
   - Extend workspace home/open results with either `projectAppListsByProjectId` or project summaries containing app count and selected app IDs.
   - Apps screen should use persisted app summaries when available, with sample apps as explicit fallback only.
   - Create project with “all apps” -> restart/open -> selected app count remains correct.
   - Create project with “choose later” -> scan run remains blocked until apps are selected.

6. `openLocalFolder` allow-list:
   - Do not allow renderer to open arbitrary absolute paths.
   - Allow only app data root, known project folders, and known generated subfolders under project folders.
   - Reject traversal, non-existing folders, arbitrary absolute paths, and file paths when a folder is expected.
   - Add tests for allowed project path, allowed app data path, and rejected arbitrary path.

7. Shared no-secret serialization:
   - Reuse core `stringifyDeterministic` and `assertNoSecretReferences` in `desktop/workspaceStorage.cts`.
   - Remove or minimize duplicate desktop-only secret/stringify helpers.
   - Tests must cover secret-looking values, not only secret-looking keys.

8. Collision-safe local IDs:
   - Project/site/auth IDs must not be only slug-derived.
   - Add collision-safe helper or compose slug with timestamp/random suffix.
   - Storage must detect existing IDs and avoid silent overwrite.
   - Duplicate project names in different folders must both appear in Home.
   - Duplicate site/auth display names must not overwrite earlier metadata.

9. Mock/browser fallback boundary:
   - Add explicit workspace mode or equivalent state:
     - loading
     - desktop metadata
     - browser fallback
     - empty
   - Empty desktop metadata should show empty Home, not mock projects.
   - Browser fallback may show sample data only with clear fallback/preview copy.

Tests to add/update:

- Core metadata validators if new helpers are added.
- Secret-looking value detection.
- Collision-safe ID helper.
- Parseable invalid metadata recovery.
- Duplicate project/site/auth names do not collide.
- App-list hydration preserves selected counts.
- Open-folder allow-list accepts known paths and rejects arbitrary paths.
- Project-local auth remains project-local on metadata edit.
- Empty desktop metadata does not show mock projects.

Final verification:

- `pnpm typecheck`
- `pnpm test`
- `pnpm desktop:compile`
- `git diff --check`
- `pnpm desktop:build`

Use Conventional Commits. Keep changes reviewable. Stop after N5 hardening is complete and reviewed. Do not proceed to N6/N7.

When finished, report:

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
11. What remains before N6 OS secure credential storage and N7 read-only kintone access.
```
