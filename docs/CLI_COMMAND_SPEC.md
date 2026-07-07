# CLI Command Specification

This document defines the MVP 1 command-line interface contract for Kintone Site Discovery.

The CLI exists for automation, testing, and future agent control. It must wrap the same `packages/core` APIs used by the desktop UI. It must not become a separate product or duplicate business logic.

## 1. Purpose

The CLI provides a stable, deterministic, headless interface for:

- validating global auth profiles and project/site configuration,
- testing kintone read access,
- fetching app lists,
- running read-only scans,
- inspecting the current local snapshot,
- building reports/developer files from a snapshot,
- creating a read-only review package,
- enabling AI/automation to control the core without driving the UI.

The primary user-facing product for MVP 1 remains the desktop UI. The CLI is a thin wrapper over the shared core.

## 2. MVP boundaries

The CLI is read-only with respect to kintone.

Do **not** implement CLI commands that imply write-back, deploy, import, restore, Git workflow, AI, or rollback.

Forbidden command names and verbs:

```text
ksd deploy
ksd import
ksd push
ksd sync
ksd publish
ksd apply
ksd restore
ksd rollback
ksd ai
ksd chat
```

Allowed external effects:

- read kintone data,
- store credentials in the OS keychain,
- write local project/snapshot/report/developer-file/review-package files.

Disallowed external effects:

- updating kintone apps, records, plugins, users, groups, spaces, files, preview settings, or deployed settings,
- writing secrets to project files, stdout, logs, snapshots, reports, developer files, or review packages.

## 3. Implementation order

Do not build the full CLI before the desktop UI skeleton.

Recommended order:

1. Define shared core interfaces in `packages/core`.
2. Implement desktop UI skeleton first: design tokens, component library, app shell, routing, onboarding with mock data.
3. Add a minimal CLI wrapper once the core command contract exists.
4. Wire both desktop UI and CLI to the same core APIs.

The CLI can be scaffolded early, but command behavior should remain thin and should not duplicate UI or collector logic.

## 4. Shared core API contract

Both desktop UI and CLI should call the same core API surface.

```ts
export interface KsdCore {
  createProject(input: CreateProjectInput): Promise<Project>;
  addAuthProfile(input: AddAuthProfileInput): Promise<AuthProfile>;
  addSiteWorkspace(input: AddSiteWorkspaceInput): Promise<SiteWorkspace>;
  testConnection(input: TestConnectionInput): Promise<TestConnectionResult>;
  fetchApps(input: FetchAppsInput): Promise<FetchAppsResult>;
  validateScan(input: ValidateScanInput): Promise<ValidateScanResult>;
  runScan(input: RunScanInput): Promise<ScanRunResult>;
  getCurrentSnapshot(input: CurrentSnapshotInput): Promise<SnapshotManifest>;
  buildReports(input: BuildReportsInput): Promise<BuildReportsResult>;
  buildDeveloperFiles(input: BuildDeveloperFilesInput): Promise<BuildDeveloperFilesResult>;
  createReviewPackage(input: CreateReviewPackageInput): Promise<CreateReviewPackageResult>;
}
```

`Project`, `AuthProfile`, `SiteWorkspace`, `SnapshotManifest`, and related models should align with `docs/ui-handoff/DATA_CONTRACT.md` and `docs/ui-handoff/SNAPSHOT_STORAGE_SPEC.md`.

## 5. Global CLI rules

### 5.1 Output modes
Every command that performs a meaningful operation must support `--json`.

Default human output should be concise and readable. JSON output should be stable and machine-readable for automation/AI.

### 5.2 Exit codes
Use stable exit codes:

| Code | Meaning |
|---:|---|
| 0 | success |
| 1 | validation/user input error |
| 2 | auth failed |
| 3 | site unreachable |
| 4 | output folder not writable |
| 5 | required collector failed |
| 6 | user canceled |
| 7 | internal/unexpected error |

### 5.3 Error shape
With `--json`, errors must return:

```json
{
  "ok": false,
  "error": {
    "code": "OUTPUT_WRITE_FAILED",
    "message": "Can't write to the local folder.",
    "detailsRedacted": true
  }
}
```

Raw stack traces must not appear unless an explicit development flag is used, and they must be redacted.

### 5.4 Secrets
Do not accept passwords via normal command-line flags, because shell history can leak them.

Forbidden:

```bash
ksd auth add --password mypassword
```

Allowed patterns:

```bash
ksd auth add --username admin@example.com
ksd auth set-password --profile prod-admin
```

Password entry must be masked and stored in the OS keychain. JSON output must only include `credentialStatus` and never the secret.

### 5.5 Sensitive capture
Sensitive capture options must require an explicit confirmation flag in non-interactive mode.

Examples:

```bash
ksd scan run --site client-a --preset full-discovery --include-plugin-assets
# must fail unless --confirm-sensitive is present

ksd scan run --site client-a --preset full-discovery --include-plugin-assets --confirm-sensitive
```

Interactive mode may prompt for confirmation instead.

### 5.6 Snapshot model
The CLI must follow the same storage model as the desktop UI:

- each successful scan creates a new timestamped snapshot,
- the latest successful snapshot becomes current by updating the pointer,
- older snapshots remain accessible from history,
- failed scans never become current,
- reports and developer files are generated from a snapshot,
- review packages are read-only handoff artifacts.

## 6. MVP command set

### 6.1 Project commands

```bash
ksd project init --name "Client CRM" --folder ./client-crm
ksd project open --folder ./client-crm --json
ksd project info --project ./client-crm --json
```

Purpose: create/open/read project metadata. Does not connect to kintone.

### 6.2 Auth commands

```bash
ksd auth add --name "Production Admin" --username admin@example.com
ksd auth set-password --profile prod-admin
ksd auth test --profile prod-admin --domain client-a.cybozu.com --json
ksd auth list --json
```

Purpose: manage global reusable auth profiles. Passwords go only to OS keychain.

### 6.3 Site commands

```bash
ksd site add --project ./client-crm --name "Client A Production" --domain client-a.cybozu.com --profile prod-admin
ksd site list --project ./client-crm --json
ksd site info --project ./client-crm --site client-a-production --json
```

Purpose: configure/read SiteWorkspace records in a project. `--profile` links to a global AuthProfile. Does not run a scan.

### 6.4 App list commands

```bash
ksd apps fetch --project ./client-crm --site client-a-production --json
ksd apps list --project ./client-crm --site client-a-production --json
```

Purpose: fetch and list apps visible to the authenticated admin user.

### 6.5 Scan commands

```bash
ksd scan validate --project ./client-crm --site client-a-production --preset standard --apps 101,102 --json
ksd scan run --project ./client-crm --site client-a-production --preset standard --apps 101,102 --json
ksd scan run --project ./client-crm --site client-a-production --preset full-discovery --apps 101,102 --include-plugin-assets --confirm-sensitive --json
```

Purpose: validate/run read-only scans.

Rules:

- `validate` never writes a snapshot.
- `run` writes a new snapshot only if output folder is writable.
- required collector failure returns status `failed` and exit code 5.
- optional collector skip returns `completed_with_warnings` and exit code 0.
- `OUTPUT_WRITE_FAILED` returns exit code 4 and must not claim partial data was saved.

### 6.6 Snapshot commands

```bash
ksd snapshot current --project ./client-crm --site client-a-production --json
ksd snapshot list --project ./client-crm --site client-a-production --json
ksd snapshot verify --project ./client-crm --site client-a-production --snapshot current --json
```

Purpose: inspect and verify local snapshots. Does not connect to kintone.

### 6.7 Report/developer-file commands

```bash
ksd reports build --project ./client-crm --site client-a-production --snapshot current --json
ksd reports list --project ./client-crm --site client-a-production --snapshot current --json
ksd developer-files build --project ./client-crm --site client-a-production --snapshot current --json
ksd developer-files list --project ./client-crm --site client-a-production --snapshot current --json
```

Purpose: generate/read outputs derived from a snapshot.

### 6.8 Review package command

```bash
ksd package create-review --project ./client-crm --site client-a-production --snapshot current --output ./packages --json
```

Purpose: create a read-only zip handoff package from a snapshot. The package must include:

- `manifest.json`,
- `reports/`,
- `developer-files/`,
- `redaction-log.jsonl`,
- `README.md` explaining that this is not an import/deploy package.

## 7. Example JSON outputs

### Scan success

```json
{
  "ok": true,
  "status": "completed",
  "scanRunId": "scan_20260702_1035",
  "snapshotId": "snap_20260702_1035",
  "requiredOk": 68,
  "requiredTotal": 68,
  "optionalSkipped": 0,
  "warningCount": 0,
  "currentSnapshot": true
}
```

### Scan completed with warnings

```json
{
  "ok": true,
  "status": "completed_with_warnings",
  "scanRunId": "scan_20260702_1035",
  "snapshotId": "snap_20260702_1035",
  "requiredOk": 68,
  "requiredTotal": 68,
  "optionalSkipped": 1,
  "warningCount": 2,
  "currentSnapshot": true
}
```

### Scan failed

```json
{
  "ok": false,
  "status": "failed",
  "scanRunId": "scan_20260702_1035",
  "snapshotId": "snap_20260702_1035",
  "currentSnapshot": false,
  "error": {
    "code": "REQUIRED_COLLECTOR_FAILED",
    "message": "A required part of the data couldn't be captured, so this scan is not complete.",
    "detailsRedacted": true
  }
}
```

## 8. First implementation scope

For the first Codex UI skeleton pass, do **not** implement CLI behavior yet.

Codex may scaffold:

```text
apps/cli/
  src/main.ts
  src/commands/index.ts
```

But CLI commands should not be wired until the shared core interfaces exist.

The first implementation batch remains:

1. design tokens,
2. component library,
3. app shell,
4. routing,
5. onboarding UI with mock data.
