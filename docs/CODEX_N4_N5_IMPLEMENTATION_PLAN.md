# Codex N4-N5 Implementation Plan

This is the executable plan for the next Codex implementation pass on `develop`.

Read this file before editing code. It turns the review findings into a strict implementation sequence for N4 and N5.

## Goal

Move the project from a mock desktop/UI scaffold to a safe local-foundation build:

1. Add a shared pure TypeScript domain package (`packages/core`).
2. Align the renderer with the canonical data contract before anything is persisted.
3. Add local app metadata and project-folder persistence through the desktop platform bridge.
4. Keep scan screens mock-only for kintone data until the next reviewed phase.

The product remains a Windows desktop app that reads from kintone later and writes local files only. Nothing in this batch may write back to kintone.

## Hard boundaries

Implement only N4 and N5 plus the P0 contract/flow corrections listed here.

Do not implement:

- real kintone API calls,
- real login/session handling,
- real scan runner,
- scan snapshot capture,
- report/developer-file generation,
- OS secure credential storage,
- CLI command behavior,
- deploy/import/write-back/sync/push/publish/apply/restore/rollback,
- Git client features,
- AI/chat/analysis features,
- Windows installer/packaging.

Credential-related files may contain only metadata and future `keychainRef` placeholders. Never persist passwords, tokens, cookies, authorization headers, or raw kintone responses.

## Implementation order

### Step 0 - Baseline

Before changing implementation files:

1. Confirm the branch is `develop`.
2. Do not reset or rebase `develop`.
3. Keep commits small and use Conventional Commits.
4. Run the current verification commands if the environment allows it:
   - `pnpm typecheck`
   - `pnpm desktop:compile`
   - `git diff --check`
   - `pnpm desktop:build`

If `pnpm desktop:build` fails only because Vite/esbuild is blocked by the sandbox with `Cannot read directory "../../.."`, record it and rerun outside the sandbox.

### Step 1 - Workspace setup for `packages/core`

Update workspace configuration before adding the package.

Expected `pnpm-workspace.yaml` shape:

```yaml
packages:
  - "packages/*"

allowBuilds:
  esbuild: true
```

Add `packages/core` as a pure TypeScript workspace package. Suggested structure:

```text
packages/core/
  package.json
  tsconfig.json
  src/
    index.ts
    types.ts
    constants.ts
    validators.ts
    json.ts
    errors.ts
```

Rules:

- No filesystem access.
- No Electron imports.
- No browser globals.
- No kintone calls.
- No Node-only runtime APIs.
- Renderer must be able to import it without pulling privileged code.

### Step 2 - Canonical domain exports

Move or mirror the canonical shapes from `docs/ui-handoff/DATA_CONTRACT.md` into `packages/core`.

At minimum export:

- `Id`, `ISODateString`, `SchemaVersion`,
- `ResultStatus = 'completed' | 'completed_with_warnings' | 'failed'`,
- `ConnectionStatus`, `CredentialStatus`, `AppCaptureStatus`, `Freshness`,
- `PresetId = 'quick' | 'standard' | 'full_discovery'`,
- `CategoryTier`, `CollectorStatus`, `CollectorKind`,
- `AuthType = 'password'`,
- `ProjectAuthSelection`, `SnapshotAuthSelection`,
- `Project`, `ConnectedSite`, `AuthProfile`,
- `AppSummary`, `ScanPreset`, `CaptureCategory`, `SensitiveCaptureOption`,
- `ScanRun`, `ScanResult`, `CollectorResult`,
- `SnapshotManifest`, `SnapshotSummary`,
- `ReportItem`, `DeveloperFileItem`, `FileOrderItem`,
- `RedactionSummary`, `ErrorStateModel`, `ErrorCode`.

Keep canonical enum values in snake_case. Human labels belong in UI copy mappings, not in persisted data models.

### Step 3 - Core constants, labels, and validators

Add core constants for capture presets and categories:

- required categories are locked and default-on,
- recommended categories are default-on and user-toggleable,
- additional/sensitive categories are default-off and user opt-in,
- `full_discovery` opens sensitive configuration and must not one-click enable every sensitive item.

Add UI-safe label maps separately from canonical values, for example:

```ts
RESULT_STATUS_LABELS.completed = "Completed";
RESULT_STATUS_LABELS.completed_with_warnings = "Completed with warnings";
RESULT_STATUS_LABELS.failed = "Failed";
```

Add pure validators/normalizers for:

- kintone domain strings: reject protocol, path, query, credentials, port, spaces, and invalid host syntax; normalize by trimming and lowercasing,
- project names: non-empty, length-bounded, no Windows-reserved path names,
- Windows-safe local paths: pure validation only in N4; actual filesystem checks belong in N5,
- local IDs: stable opaque IDs with allowed prefix/character rules,
- app selection state: at least one selected app before scan routes,
- `Project`, `ConnectedSite`, `AuthProfile`, and `ProjectAuthSelection` metadata,
- no-secret serialization: reject or strip keys/values that look like password, token, cookie, authorization header, session, or private key.

Use a typed result shape instead of throwing for expected validation failures, for example:

```ts
type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string; field?: string } };
```

Add deterministic JSON helpers:

- stable key ordering,
- ISO timestamp helper if needed,
- safe serialization that does not include secret values.

### Step 4 - Align renderer types with core before persistence

Fix the current model drift before N5 writes anything to disk.

Required corrections:

1. Replace UI-only `ResultStatus` label unions with canonical `ResultStatus` plus label mapping.
2. Replace scan preset id `full` with canonical `full_discovery`.
3. Replace project auth shape from `authProfileId` only to `authSelection`:
   - `{ kind: 'global_profile'; authProfileId }`, or
   - `{ kind: 'project_local'; displayName; username; authType; credentialStatus; keychainRef? }`.
4. Keep `ConnectedSite` auth-free. A site never owns an auth profile.
5. Rename or isolate legacy mock types so they cannot be mistaken for persisted domain models.
6. Keep route/page copy clear: Project state is project-scoped; page copy may show linked Connected Site context.

Do not persist any current mock shape until it conforms to the canonical core types.

### Step 5 - Fix scan draft, route guards, and sensitive confirmation

Create a single scan draft/view model for renderer state. It should include:

- `projectId`,
- `presetId`,
- `selectedAppIds`,
- `enabledCategoryKeys`,
- `sensitiveOptions`,
- derived `armedSensitiveOptions`,
- derived `canStartScan`.

Required behavior:

- `/scan/*` requires at least one selected app; otherwise redirect/guard to Apps with a clear prompt.
- Quick and Standard without sensitive options go directly to `/scan/run`.
- Full Discovery opens configuration first.
- `/scan/confirm` is reachable only when at least one sensitive option is armed.
- The confirmation modal lists the actually armed sensitive options, not hard-coded examples.
- Confirm is disabled until acknowledgment.
- `Turn these off` disables sensitive options and starts the safe run path.

The scan run itself remains mock-only in this batch. Do not implement real collectors.

### Step 6 - Fix onboarding validation before storage writes

Replace the current always-advance wizard behavior with step validation.

Required behavior:

- Continue is disabled until the current step has valid required fields.
- Project step validates project name and selected/entered folder path.
- Auth step validates either an existing global profile selection or a project-local auth draft.
- Site step validates selected existing Connected Site or new site domain metadata.
- Test step must pass before Apps step.
- Apps step requires at least one selected app.
- Password fields use secret input behavior and are never echoed into project metadata.
- A project-local auth draft created inside New Project must not appear in global Auth profiles.

Connection testing remains mocked until N7, but the wizard gate must behave as if the selected site + project auth pair is required.

### Step 7 - N5 local workspace storage primitives

Add real local metadata persistence through the desktop main process and typed platform bridge.

App-level store location:

- Resolve through Electron `app.getPath('userData')` or an equivalent platform-layer helper.
- Do not let the renderer choose arbitrary metadata-store paths.

App-level files:

```text
<AppDataRoot>/
  app-index.json
  connected-sites.json
  auth-profiles.json
  window-state.json
```

Project folder files/placeholders:

```text
<ProjectRoot>/
  project.json
  connected-site.json
  app-list.json
  current.json
  history.json
  snapshots/
  .kintone/
  .app/
    schema-version.json
    recent.json
```

Rules:

- All JSON writes must be atomic: write temp file, fsync if practical, rename.
- Use Windows-safe path handling.
- Renderer must call narrow bridge APIs, not generic filesystem read/write.
- Missing/corrupt metadata must produce recoverable error objects, not renderer crashes.
- Failed validation must surface plain-language UI messages.
- Store only auth metadata and future `keychainRef` placeholders; never store secrets.

Suggested platform bridge additions:

- `getAppMetadata()` / `saveAppMetadata()` or narrower equivalents,
- `createProject(request)` returning canonical `Project` and initialized paths,
- `openProjectFolder(path)` validating and reading project metadata,
- `listRecentProjects()`,
- `listConnectedSites()` / `saveConnectedSiteMetadata()`,
- `listAuthProfiles()` / `saveAuthProfileMetadata()`,
- `getWindowState()` / `saveWindowState()` backed by `window-state.json`,
- `chooseLocalFolder()` wired to Electron dialog for project folder selection,
- `openLocalFolder()` wired only after path validation.

Do not expose generic `readFile`, `writeFile`, `deleteFile`, or unrestricted path APIs to the renderer.

### Step 8 - Bind UI to persisted metadata, not scans

After N5 storage exists:

- Home reads Projects, Connected Sites, and Auth Profiles from app-level metadata.
- New Project creates a real project folder and writes `project.json` / `connected-site.json`.
- Open Project validates the project folder and opens a Project tab.
- Open project tabs, active tab, and last route persist across restart.
- Folder picker and open-folder actions use the platform bridge.
- Scan, snapshot, reports, developer files, and history screens may continue using mock app/snapshot data until N7-N9.

Keep the UI honest: mock scan actions should still say no real kintone request or snapshot write happened.

### Step 9 - Tests and verification

Add a minimal test setup if feasible in this batch. Prefer testing pure core logic first.

Recommended tests:

- domain validator accepts valid host-only domains and rejects protocol/path/query/credentials,
- project-name/path/local-id validators,
- preset/category defaults,
- sensitive confirmation derivation,
- no-secret serialization,
- app metadata storage read/write round trip,
- corrupt JSON recovery,
- window state persistence round trip,
- route guard helper behavior.

Required final checks:

- `pnpm typecheck`
- `pnpm desktop:compile`
- `git diff --check`
- `pnpm desktop:build`
- test command if added

## Acceptance checklist

N4 is complete when:

- `packages/core` exists and exports canonical domain types/constants/helpers.
- Renderer can import core without Node/Electron code.
- Persistable data uses snake_case canonical enum values.
- UI labels are mapped from canonical values, not stored as status values.
- Preset id is `full_discovery`, not `full`.
- Validation helpers cover domain, project, path, local ID, auth selection, app selection, and no-secret serialization.

N5 is complete when:

- App-level metadata is persisted under the desktop app data directory.
- Project folders can be created/opened/validated.
- `project.json` and `connected-site.json` use canonical core shapes.
- Auth profile metadata never contains real secrets.
- Window/project tab state persists across restart.
- Folder picker/open-folder use narrow bridge APIs.
- Missing/corrupt metadata shows recoverable UI errors.
- Scan screens remain mock-only and do not call kintone.

P0 review fixes are complete when:

- Sensitive confirmation is state-derived and only appears when sensitive captures are armed.
- Onboarding blocks invalid steps and requires a passed mocked connection test before Apps.
- `/scan/*` route guards respect selected-app and sensitive-confirmation requirements.
- Nested interactive controls in the tab bar are removed or made accessibility-safe.
- The renderer no longer treats mock view models as persisted domain models.

## Required Codex final report

When the implementation batch is complete, report:

1. Files created/changed.
2. Core package APIs added.
3. Renderer model drift fixes made.
4. Workspace storage files and exact locations.
5. Platform bridge APIs added/changed.
6. Route guard and sensitive-flow behavior changed.
7. Onboarding validation behavior changed.
8. Tests added and command results.
9. Verification command results.
10. What remains before OS credentials, real kintone reads, scan runner, local snapshot writes, reports/developer-file generation, CLI behavior, and Windows packaging.
