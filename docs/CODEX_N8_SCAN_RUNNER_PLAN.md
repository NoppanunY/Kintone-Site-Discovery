# N8 Fixture Scan Runner Plan

Status: complete.

N8 adds the first scan orchestration path, using fixture collectors only. It proves the run state model, result mapping, failure behavior, and local history persistence before any real collector output, snapshot writer, reports, Developer Files, review packages, CLI behavior, or packaging work.

## Source of truth

Read these before implementing N8:

1. `docs/MVP1_SPEC.md`
2. `docs/ui-handoff/DATA_CONTRACT.md`
3. `docs/ui-handoff/SNAPSHOT_STORAGE_SPEC.md`
4. `docs/ui-handoff/STATE_MATRIX.md`
5. `docs/ui-handoff/UX_COPY_SPEC.md`
6. `docs/CODEX_NEXT_WINDOWS_DESKTOP_PLAN.md`

## Hard boundaries

Do not implement in N8:

- real kintone collector endpoint fan-out beyond N7 connection/app-list access
- raw or normalized snapshot data writes
- `snapshots/snap_<timestamp>/` creation
- `current.json` pointer updates
- report generation
- Developer Files generation
- review package creation
- CLI commands
- browser runtime plugin config capture
- browser network asset capture
- sample/full record capture
- any kintone write-back

Allowed local effects in N8:

- Build a fixture `ScanRun` and `ScanResult`.
- Persist the finished run into project `history.json`.
- Read project history for the History screen.
- Return redacted run status/results through the desktop bridge.

## Target behavior

1. User starts a scan from the existing scan setup route.
2. Renderer enters the scan running route and calls a desktop bridge method.
3. Desktop resolves project/site/app-list metadata, builds a fixture run, and appends it to `history.json`.
4. Renderer shows fixture progress, stays on the running page after completion, and waits for the user to open the result.
5. Scan result uses the real `ScanRun.result` counts instead of static mock copy.
6. History screen can display persisted fixture runs.

## Fixture runner rules

- Preserve selected app ID order.
- Required collectors must all be `done` for `completed` or `completed_with_warnings`.
- Optional collector skips produce `completed_with_warnings`.
- A required collector failure produces `failed`.
- Fixture failed runs do not claim partial snapshot data was saved.
- No passwords, auth headers, cookies, tokens, or raw kintone responses may appear in run metadata, logs, stdout, stderr, or bridge results.

## Storage boundary

N8 writes only `history.json`:

```jsonc
{
  "schemaVersion": 1,
  "runs": [ScanRun]
}
```

N8 must not change:

- `current.json`
- any `snapshots/` folder
- report/developer-file folders

## Bridge shape

```ts
interface StartFixtureScanRunRequest {
  projectId: string;
  presetId: PresetId;
  selectedAppIds: string[];
  enabledCategoryKeys: string[];
  sensitiveOptions: SensitiveCaptureOption[];
}

interface StartFixtureScanRunResult extends BridgeResult {
  run?: ScanRun;
}

interface GetProjectScanHistoryRequest {
  projectId: string;
}

interface GetProjectScanHistoryResult extends BridgeResult {
  runs: ScanRun[];
}
```

Method names should remain explicit about fixture behavior so this phase is not mistaken for real capture.

## Tests

Core tests:

- completed fixture run has all required collectors done and no snapshot ID
- warning fixture run has optional skipped collectors and `completed_with_warnings`
- failed fixture run has required failure, error model, and no partial snapshot claim
- selected app order is preserved

Desktop tests:

- appending a fixture run writes `history.json`
- appending history does not update `current.json`
- invalid selected app IDs are rejected before history write
- history read returns persisted runs

Renderer verification:

- Start scan moves through running route to result.
- Result counts come from the returned fixture run.
- History shows persisted fixture rows.

## Acceptance criteria

N8 is complete when:

- The desktop app can start a fixture scan from selected apps.
- A finished fixture `ScanRun` is persisted to project `history.json`.
- The result screen reflects fixture run status and counts.
- The History screen can display persisted fixture runs.
- Failed fixture runs do not claim saved partial snapshot data.
- No snapshot folder or current pointer is written in N8.
- Browser fallback remains unavailable/stubbed for desktop scan-run persistence.
- All standard verification commands pass or have documented environment-only failures.

## Completion notes

Implemented in N8:

- Added `packages/core/src/fixtureScanRunner.ts` with deterministic fixture `ScanRun` / `ScanResult` construction.
- Added core fixture coverage for completed, completed-with-warnings, failed, selected app order, and no-snapshot behavior.
- Added desktop bridge methods:
  - `startFixtureScanRun`
  - `getProjectScanHistory`
- Added project storage support for appending fixture runs to `history.json`.
- Added validation that selected app IDs must exist in the project app list before history is written.
- Verified N8 does not update `current.json` and does not create snapshot folders.
- Wired the renderer scan flow:
  - scan setup records selected preset
  - scan running route starts a bridge-backed fixture run
  - scan running stays in place after completion and exposes explicit exit/result actions
  - scan result uses returned `ScanRun.result` counts/status after the user opens it
  - history loads persisted fixture runs
- Kept snapshot, reports, Developer Files, review packages, CLI behavior, browser capture, and kintone write-back out of N8.

Verification completed:

- `pnpm typecheck`
- `pnpm test`
- `pnpm desktop:compile`
- `git diff --check`
- `pnpm desktop:build` passed after rerunning outside the sandbox because Vite/esbuild was blocked by the managed sandbox.
