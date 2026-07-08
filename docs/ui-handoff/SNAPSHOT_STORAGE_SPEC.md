# SNAPSHOT_STORAGE_SPEC

Exact local folder layout for Kintone Site Discovery MVP 1. Read-only product — files are only ever written locally; nothing is sent back to kintone. Interfaces referenced here are defined in `DATA_CONTRACT.md`.

## Core rule — snapshots are append-only, current is a pointer

> **Each successful scan creates a NEW timestamped snapshot folder.**
> **The latest successful snapshot is marked as _current_ via a pointer file.**
> **Older snapshots remain on disk and accessible from History until explicitly deleted.**

Re-running a scan does **not** overwrite or delete the previous snapshot. It:
1. creates `snap_<timestamp>/` and captures into it,
2. on success, updates `current.json` to point at the new snapshot and flips `isCurrent` in the index,
3. leaves prior snapshots intact (they show in History; the previous current becomes a non-current historical snapshot).

"Replace" is never used loosely. The only things that change on a successful re-run are **the current-snapshot pointer** and the **derived Reports/Developer Files that the current views read** (which always read from whatever `current.json` points to). A failed scan never becomes current.

## Current workspace model for storage

The current desktop model is one site per project:

- `ConnectedSite` records are app-level reusable site targets. They live outside the project folder.
- `Project` is the local folder/workspace that selects exactly one `ConnectedSite` and one project auth selection.
- Multiple Projects may reference the same `ConnectedSite`.
- Older specs may use `SiteWorkspace`; for this storage spec, treat that as the Project's linked ConnectedSite context.

## 1. App-level metadata store

The desktop app owns an app-level metadata directory, resolved through the desktop platform layer (for Electron, use the app data/user data directory rather than the renderer).

```
<AppDataRoot>/
├── app-index.json                  # recent projects and schema version
├── connected-sites.json            # ConnectedSite[]; domain/display metadata only
├── auth-profiles.json              # AuthProfile metadata + keychainRef only; never secrets
└── window-state.json               # open Project tabs and active tab
```

App-level files must never contain passwords, tokens, cookies, authorization headers, or raw kintone responses.

## 2. Project folder structure
```
<ProjectRoot>/                      # Project.folderPath
├── project.json                    # Project (DATA_CONTRACT #1)
├── connected-site.json             # cached selected ConnectedSite display/domain; no auth
├── app-list.json                   # AppSummary[] + appListFetchedAt (freshness)
├── current.json                    # CURRENT SNAPSHOT POINTER  (see §5)
├── history.json                    # ScanRun[] index / SnapshotSummary[] (see §6)
├── snapshots/                      # all snapshots, append-only
│   ├── snap_20260628_1602/         # older successful snapshot (kept)
│   └── snap_20260702_1035/         # latest successful snapshot (current)
├── .kintone/                       # machine-managed internal data (see §9)
└── .app/                           # app-managed project metadata
    ├── schema-version.json
    └── recent.json                 # recent-open bookkeeping
```
Secrets are never in any project file here. Passwords live in the OS keychain once N6 is implemented. N5 may persist only `authSelection` metadata and future credential references, not real secrets.

## 3. Project metadata files

`project.json` stores the local Project identity, selected `siteId` (ConnectedSite id), `authSelection`, schema version, and timestamps. It must not store the selected auth secret.

`connected-site.json` is a project-local cache of the selected ConnectedSite display name and domain so the project remains inspectable even if the app-level site index is missing. It is not the credential owner and does not store auth.

`app-list.json`, `current.json`, `history.json`, `snapshots/`, and `.kintone/` all belong to the Project folder because one Project has one linked site in the current model.

## 4. Snapshot folder structure
Each `snap_<timestamp>/` is a complete, self-contained capture. Reports and Developer Files are **generated into the snapshot** — they are views of it, not separate stores.
```
snapshots/snap_20260702_1035/
├── manifest.json                   # SnapshotManifest (#11) — SOURCE OF TRUTH
│                                   #   includes fileOrder[] (#15) and redaction summary
├── data/                           # normalized captured data (per category)
│   ├── apps/<kintoneAppId>/...     # form, fields, layout, views, process, perms…
│   ├── plugins/...                 # inventory + saved config
│   ├── org/...                     # users, groups, departments, spaces
│   └── dependencies/...            # dependency + preview-vs-live diff data
├── reports/                        # generated markdown views (ReportItem.filePath)
│   ├── site-summary.md
│   ├── apps-summary.md
│   ├── plugins-summary.md
│   ├── dependency-report.md
│   └── scan-report.md
├── developer-files/                # advanced/structured views (DeveloperFileItem)
│   ├── structured-data.jsonl
│   ├── export-manifest.json
│   └── customization/              # JS/CSS in preserved execution order
│       └── <kintoneAppId>/desktop/001-common.js …
└── logs/
    └── redaction-log.jsonl         # RedactionSummary.logPath target (see §13)
```

## 5. Current snapshot pointer — `<ProjectRoot>/current.json`
```jsonc
{
  "projectId": "project_client_crm",
  "siteId": "site_abc",
  "currentSnapshotId": "snap_20260702_1035",
  "currentSnapshotPath": "snapshots/snap_20260702_1035",
  "updatedAt": "2026-07-02T10:40:03Z"
}
```
- Written atomically (temp file + rename) only after a scan finishes with status `completed` or `completed_with_warnings`.
- The UI's "current snapshot" always resolves through this project-local pointer.
- A `failed` scan never updates this pointer.

## 6. History file — `<ProjectRoot>/history.json`
Append-only index of every run (success, warnings, failed). Powers SCR-15.
```jsonc
{
  "runs": [
    {
      "scanRunId": "scan_20260702_1035",
      "projectId": "project_client_crm",
      "snapshotId": "snap_20260702_1035",   // omitted/null if no snapshot written
      "status": "completed_with_warnings",
      "startedAt": "2026-07-02T10:35:00Z",
      "finishedAt": "2026-07-02T10:40:41Z",
      "requiredOk": 68, "requiredTotal": 68,
      "optionalSkipped": 1, "warningCount": 2,
      "appsCaptured": 4, "redactions": 4,
      "isCurrent": true,                     // matches current.json
      "snapshotPath": "snapshots/snap_20260702_1035"
    }
  ]
}
```
Entries are never mutated except `isCurrent`, which flips when the pointer moves. Deleting a snapshot removes its folder and sets its history entry `snapshotDeleted: true` (row remains for the record; artifacts marked unavailable).

## 7. Reports location
`snapshots/<snapshotId>/reports/*.md`. The Reports screen (SCR-13) lists the current snapshot's reports. Freshness = whether the report file's `generatedAt` matches the manifest's `capturedAt`. MVP report viewing = open in OS-default markdown app (no in-app viewer).

## 8. Developer files location
`snapshots/<snapshotId>/developer-files/`. Structured files at the top; customization JS/CSS under `customization/<kintoneAppId>/<platform>/`, filenames prefixed with their `orderIndex` (`001-`, `002-`) so the on-disk order matches the manifest. Display order is driven by `manifest.fileOrder`, never by filesystem sort.

## 9. `.kintone` internal folder — `<ProjectRoot>/.kintone/`
Machine-managed. Warning-gated in the UI (SCR-17). Not needed for normal use.
```
.kintone/
├── raw/                  # raw API snapshots (pre-normalization)
├── normalized/           # intermediate normalized JSON
├── collector-results/    # CollectorResult[] per run
└── logs/                 # engine/debug logs
```
The app treats this as internal; users are told not to edit it. It is per-project working area for the linked site, not per-snapshot.

## 10. Failed scan / partial summary location
A failed or canceled run still writes what it captured, for inspection, but **does not become current**.
```
snapshots/snap_<timestamp>/          # partial snapshot folder (status: "failed")
├── manifest.json                    # status: "failed", isCurrent: false
├── data/…                           # whatever was captured before the stop
└── partial-summary.md               # ScanResult.partialSummaryPath target
```
- `partial-summary.md` is what "Review partial scan summary" (SCR-11) opens.
- If `OUTPUT_WRITE_FAILED` prevented writing at all, nothing is persisted — the UI states: "Partial results are not saved yet. Choose a writable folder to save them, or retry." (never claims in-memory retention).

## 11. Manifest schema — `manifest.json`
Serialized `SnapshotManifest` (DATA_CONTRACT #11). Required top-level keys:
`snapshotId, scanRunId, projectId, siteId, siteDomain, authSelection, schemaVersion, capturedAt, status, isCurrent, presetId, enabledCategoryKeys, appIds, counts, sizeBytesOnDisk, integrity, fileOrder, redaction, reports, developerFiles`.
- `integrity.algorithm = "sha256"`; a content hash over `data/` verifies the snapshot; `integrity.verified=false` ⇒ UI shows "Integrity check failed" (SCR-12) + Re-run.
- `schemaVersion` gates migration; mismatched versions prompt a read-only compatibility notice.

## 12. File order metadata location
**Stored in `manifest.json` → `fileOrder: FileOrderItem[]`** (not only in the Developer Files view). Each item carries `orderIndex`, `orderSource`, `confidence`, `scope`, `appId`, `fileName`, `filePath`. Any surface that shows customization files reads this array; ordering is the data, not a UI choice.

## 13. Redaction log location
`snapshots/<snapshotId>/logs/redaction-log.jsonl` — one JSON line per redaction event `{ at, type, appId?, field?, reason }`. `RedactionSummary.logPath` points here; the log is included in the review package. Redaction is locked on for MVP 1.

## 14. Review package (export for sharing/handoff — not deploy/import)
"Create review package" (SCR-14) produces a zip of the **current** snapshot:
```
<siteName>-review-<timestamp>.zip
├── manifest.json                 # current SnapshotManifest
├── reports/                      # all current reports (markdown)
├── developer-files/              # structured files + customization (order preserved)
├── redaction-log.jsonl
└── README.md                     # what this package is, capture date, read-only note
```
Default save location: the project root (`<ProjectRoot>/packages/`), user can choose another writable folder. The README explicitly states the package is a read-only review artifact and is not for importing/deploying back into kintone.

## Atomicity & safety
- All pointer/index writes are temp-file + atomic rename.
- Snapshot capture writes to a temp dir, then renames into `snapshots/` on success; a crashed capture leaves a `snap_*.partial` dir cleaned up on next launch.
- Output-folder writeability is checked at scan start; failure ⇒ `OUTPUT_WRITE_FAILED` before any partial write is promised.
