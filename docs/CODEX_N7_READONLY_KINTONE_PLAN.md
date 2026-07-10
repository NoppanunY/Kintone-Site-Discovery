# N7 Read-Only Kintone Access Plan

Status: complete.

N7 is the next implementation phase after N6 secure credential storage. Its purpose is to add the first read-only kintone access layer needed by the desktop app, while stopping before scan orchestration, snapshot writes, report generation, Developer Files, review packages, CLI behavior, or packaging.

## Source of truth

Read these before implementing N7:

1. `docs/MVP1_SPEC.md`
2. `docs/CODEX_IMPLEMENTATION_HANDOFF.md`
3. `docs/CODEX_NEXT_WINDOWS_DESKTOP_PLAN.md`
4. `docs/WORKSPACE_PROFILE_SPEC.md`
5. `docs/FILE_ORDER_SPEC.md`
6. `docs/ui-handoff/DATA_CONTRACT.md`
7. `docs/ui-handoff/SNAPSHOT_STORAGE_SPEC.md`
8. `docs/ui-handoff/STATE_MATRIX.md`
9. `docs/ui-handoff/UX_COPY_SPEC.md`
10. `docs/CLI_COMMAND_SPEC.md`

Before coding against kintone REST endpoints, verify endpoint details against official kintone documentation. Keep N7 implementation behind the existing read-only MVP boundary.

## Current prerequisites

N7 starts from:

- `packages/core` domain types, validators, no-secret serialization, scan guards, and app picker helpers.
- Desktop workspace metadata storage for Projects, Connected Sites, Auth Profiles, and selected app metadata.
- Desktop secure credential storage with opaque `keychainRef` values and no raw secrets in metadata.
- Browser fallback mode that can show UI but cannot perform desktop storage or real kintone access.

## Hard boundaries

Do not implement in N7:

- scan runner orchestration
- snapshot folder creation beyond existing metadata scaffolding
- raw/normalized collector output
- report generation
- Developer Files generation
- review package zip creation
- CLI command behavior
- kintone write-back of any kind
- deploy/import/push/sync/publish/apply/restore/rollback APIs or UI
- API token, OAuth, or secret entry modes beyond existing password credential flow
- plugin browser runtime capture or plugin network asset capture
- sample records or full records capture

Allowed external effects in N7:

- Read stored credentials from the desktop credential provider in the main process only.
- Make explicit read-only kintone requests for connection validation and app-list discovery.
- Persist fetched app summary metadata locally through existing app-list storage APIs.
- Return redacted errors/status to the renderer.

## Target architecture

Add shared read-only kintone client logic under `packages/core`, with platform-specific credential resolution kept in `desktop`.

Proposed layers:

- `packages/core/src/kintoneClient.ts`: read-only HTTP client contracts, request helpers, response normalization, and redacted error mapping.
- `packages/core/src/kintoneApps.ts`: app-list fetch normalization into existing `AppSummary` shape.
- `packages/core/src/kintoneConnection.ts`: connection validation result model and status mapping.
- `desktop/main.cts`: bridge handlers that resolve project/site/auth metadata and load credentials internally before calling the core client.
- `src/platform/bridgeTypes.ts`: typed bridge methods/results for read-only connection validation and app-list fetch.
- Renderer screens: keep actions explicit, scoped, and status-driven; do not silently fetch during navigation.

The renderer must never receive a password. Core request code may accept credentials only as transient function arguments and must never serialize them.

## N7 implementation steps

1. Add core read-only client contracts.
   - Define `KintoneReadOnlyClient`, auth input, request options, and normalized error/result types.
   - Add redaction helpers for URLs, headers, auth failures, network errors, and response bodies.
   - Add tests for no-secret error output.

2. Add fixture-first connection validation.
   - Support a fake transport for unit tests.
   - Map success, unreachable site, auth failure, permission failure, and malformed response into stable result codes.
   - Keep browser fallback unavailable for real validation.

3. Add fixture-first app-list fetch.
   - Normalize read-only app list responses into `AppSummary[]`.
   - Preserve source order from kintone response.
   - Keep `selectedAppIds` behavior compatible with N5 app-list storage.
   - Add tests for order preservation and invalid/missing fields.

4. Add desktop credential resolution.
   - Load credentials only in the Electron main process using `readCredentialForInternalUse`.
   - Resolve global profile or project-local auth selection from existing metadata.
   - Return `no_credential`, `needs_update`, or redacted auth errors without leaking secrets.

5. Add desktop bridge methods.
   - Add `validateKintoneConnection(projectId | site/auth draft)` if needed by UI.
   - Add `fetchKintoneAppList(projectId)` or similarly scoped method for the Apps page/New Project flow.
   - Reuse existing `updateProjectAppList` for local persistence after successful fetch.

6. Wire minimal desktop UI.
   - Replace mock-only connection test behavior with bridge-backed read-only validation when desktop metadata is available.
   - Add explicit fetch/refresh behavior for real app-list metadata.
   - Keep disabled/unavailable states clear in browser fallback.
   - Do not start scans from this phase.

7. Verification and documentation.
   - Update handoff/roadmap docs when N7 is complete.
   - Add/adjust tests before manual verification.
   - Run the standard verification commands.

## Suggested bridge shapes

Names are allowed to change during implementation if local code patterns suggest better names, but results should remain stable and automation-friendly.

```ts
interface ValidateKintoneConnectionRequest {
  projectId?: string;
  siteId?: string;
  authProfileId?: string;
}

interface ValidateKintoneConnectionResult extends BridgeResult {
  status?: "connected" | "unreachable" | "auth_failed" | "permission_denied" | "no_credential";
  checkedAt?: string;
}

interface FetchKintoneAppListRequest {
  projectId: string;
}

interface FetchKintoneAppListResult extends BridgeResult {
  apps?: AppSummary[];
  fetchedAt?: string;
}
```

Do not expose credential values in these request or result types.

## Tests to add

Core tests:

- connection validation maps success/failure states through a fake transport
- redacted errors do not include password, authorization headers, cookies, bearer strings, or high-entropy tokens
- app-list normalization preserves response order
- app-list normalization rejects invalid IDs/names safely
- app-list selected IDs remain a subset of fetched apps

Desktop tests:

- bridge/storage path returns `no_credential` when credential ref is missing
- desktop credential resolution never writes credential values to metadata
- successful app-list fetch updates `app-list.json` through existing storage rules
- failed app-list fetch does not replace existing app-list metadata

Renderer tests are optional in N7 unless the implementation adds complex UI state. Keep them focused if added.

## Acceptance criteria

N7 is complete when:

- A desktop project can explicitly validate a kintone connection through read-only code paths.
- A desktop project can explicitly fetch and persist real app-list summary metadata through read-only code paths.
- Browser fallback clearly reports real kintone access as unavailable.
- No raw credentials appear in metadata, logs, stdout/stderr, bridge results, tests, or serialized files.
- App-list order from kintone is preserved in memory and local app-list metadata.
- Failures are stable, redacted, and do not overwrite successful local metadata.
- No scan runner, snapshot output, reports, Developer Files, CLI command behavior, or write-back APIs are introduced.

## Completion notes

Implemented in N7:

- Added `packages/core/src/kintoneClient.ts` with read-only password-auth request helpers, fake-transport support, app-list pagination, response normalization, status mapping, and redaction helpers.
- Verified official kintone endpoint/auth details before implementation:
  - Password auth uses `X-Cybozu-Authorization` with base64 `login:password`.
  - App list uses `GET /k/v1/apps.json`, supports password/session/OAuth auth, does not support API token auth, and returns at most 100 apps per request.
- Added desktop main-process credential resolution in `desktop/kintoneAccess.cts`; credentials are loaded only through `readCredentialForInternalUse` and never returned to the renderer.
- Added bridge methods:
  - `validateKintoneConnection({ projectId })`
  - `fetchKintoneAppList({ projectId })`
- Added explicit renderer wiring:
  - Auth profile Test now validates through the desktop bridge when desktop metadata is available.
  - Apps Reload list now fetches and persists real app-list metadata through the desktop bridge.
  - Browser fallback remains unavailable for real kintone access.
- Updated app-list storage so successful fetches write `appListFetchedAt`; failed fetches do not replace existing app-list metadata.
- Added fixture tests for auth header/redaction, pagination/order preservation, status mapping, credential resolution, no-credential handling, and app-list persistence.

Still intentionally not implemented:

- Scan runner orchestration.
- Snapshot collector output.
- Reports, Developer Files, and review package generation.
- CLI command behavior.
- API token/OAuth auth modes.
- Browser runtime plugin config or asset capture.
- Any kintone write-back/deploy/import/sync behavior.

## Verification commands

Run after implementation:

```powershell
pnpm typecheck
pnpm test
pnpm desktop:compile
git diff --check
pnpm desktop:build
```

If `pnpm desktop:build` fails only because Vite/esbuild is blocked by the sandbox with `Cannot read directory "../../.."`, rerun the same command outside the sandbox and document the result.
