# DATA_CONTRACT

Canonical TypeScript-style interfaces for Kintone Site Discovery MVP 1. **Every screen and component references these models** (see `VIEW_MODEL_SPEC.md`) instead of inventing object shapes. Read-only product — no model carries a write-back/deploy field.

Conventions:
- `ISODateString = string` (ISO 8601, UTC, e.g. `"2026-07-02T10:35:12Z"`).
- `Id = string` (opaque, stable, app-generated unless noted).
- All IDs are local; kintone-side identifiers are namespaced (`kintoneAppId`).
- **No interface ever contains a password/secret.** Credentials live in the OS keychain; models carry only a `credentialStatus`.

```ts
// ────────────────────────────────────────────────────────────
// Shared enums / unions (fixed vocabularies)
// ────────────────────────────────────────────────────────────
type ResultStatus = 'completed' | 'completed_with_warnings' | 'failed';
// UI labels (fixed): "Completed" | "Completed with warnings" | "Failed"

type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'unreachable' | 'auth_failed';
type CredentialStatus = 'saved' | 'needs_update' | 'no_credential' | 'invalid';
type AppCaptureStatus = 'in_snapshot' | 'not_captured' | 'last_scan_warning';
type Freshness = 'up_to_date' | 'stale' | 'missing';
type PresetId = 'quick' | 'standard' | 'full_discovery';
type NavKey =
  | 'overview' | 'apps' | 'scan'
  | 'local_snapshot' | 'reports' | 'developer_files' | 'history'
  | 'settings' | 'advanced_internal_data';
type CategoryTier = 'required' | 'recommended' | 'additional';
type CollectorStatus = 'done' | 'running' | 'skipped' | 'queued' | 'failed';
type CollectorKind = 'required' | 'optional';
type OrderSource = 'api' | 'inferred' | 'manual_fallback';
type Confidence = 'high' | 'medium' | 'low';
type AuthType = 'password'; // MVP 1: username/password only

// UI-only view states may use additional snake_case values (for example
// 'never_fetched', 'empty_result', 'ready_with_warnings', 'integrity_error').
// Keep data-model enum values in snake_case; map them to human labels in UX_COPY_SPEC.

// Error taxonomy — code is for support, never the UI headline
type ErrorCode =
  | 'AUTH_FAILED' | 'SITE_UNREACHABLE' | 'OUTPUT_WRITE_FAILED'
  | 'REQUIRED_COLLECTOR_FAILED' | 'PERMISSION_DENIED' | 'SCAN_CANCELED'
  | 'REPORT_NOT_FOUND' | 'SNAPSHOT_INTEGRITY_FAILED' | 'APP_FETCH_FAILED';

// ────────────────────────────────────────────────────────────
// 1. Project
// ────────────────────────────────────────────────────────────
interface Project {
  id: Id;
  name: string;
  folderPath: string;          // absolute local path to the project root
  createdAt: ISODateString;
  lastOpenedAt: ISODateString;
  siteId: Id;                  // → ConnectedSite.id
  authProfileId: Id;           // → global AuthProfile.id selected for this project
  schemaVersion: number;       // storage schema version (see SNAPSHOT_STORAGE_SPEC)
}

// ────────────────────────────────────────────────────────────
// 2. AuthProfile  (global reusable credential identity — NEVER holds the secret)
// ────────────────────────────────────────────────────────────
interface AuthProfile {
  id: Id;
  displayName: string;         // "Production Admin"
  username: string;            // "admin@example.com"
  authType: AuthType;          // 'password'
  credentialStatus: CredentialStatus;
  keychainRef: string;         // opaque handle into the OS keychain (not the secret)
  linkedProjectIds: Id[];      // Project.id[] selecting this global profile
  lastTestedAt?: ISODateString;
}

// ────────────────────────────────────────────────────────────
// 3. ConnectedSite
// ────────────────────────────────────────────────────────────
interface ConnectedSite {
  id: Id;
  displayName: string;         // "Client A Production"
  domain: string;              // "client-a.cybozu.com" (validated, no scheme)
  savedStatus: 'saved' | 'unused';
  linkedProjectIds: Id[];      // Project.id[] using this site target
  createdAt: ISODateString;
}

// ────────────────────────────────────────────────────────────
// 4. AppSummary  (friendly facts only — no raw JSON/endpoints)
// ────────────────────────────────────────────────────────────
interface AppSummary {
  id: Id;                      // local id
  kintoneAppId: number;        // e.g. 101
  name: string;                // "Sales Management"
  spaceName?: string;          // "CRM"
  isGuestSpace: boolean;
  hasPlugins: boolean;
  hasCustomization: boolean;
  captureStatus: AppCaptureStatus;
  lastCapturedAt?: ISODateString;
}

// ────────────────────────────────────────────────────────────
// 5. ScanPreset
// ────────────────────────────────────────────────────────────
interface ScanPreset {
  id: PresetId;
  name: string;                // "Standard Scan"
  description: string;
  isRecommended: boolean;      // Standard = true
  includedCategoryKeys: string[];   // CaptureCategory.key[] enabled by this preset
  opensSensitiveConfig: boolean;    // full_discovery = true (route to SCR-06 → SCR-07)
}

// ────────────────────────────────────────────────────────────
// 6. CaptureCategory  (a scannable data category)
// ────────────────────────────────────────────────────────────
interface CaptureCategory {
  key: string;                 // "form_fields", "users_groups", "plugin_config"
  label: string;               // "Users, groups & departments"
  tier: CategoryTier;          // required | recommended | additional
  collectorKind: CollectorKind;// required tier ⇒ 'required'
  locked: boolean;             // required ⇒ true (checked & disabled)
  sensitive: boolean;          // true ⇒ contributes to confirmation modal
  defaultEnabled: boolean;     // required=true, recommended=true, additional=false
}

// ────────────────────────────────────────────────────────────
// 7. SensitiveCaptureOption  (the opt-in, off-by-default items)
// ────────────────────────────────────────────────────────────
interface SensitiveCaptureOption {
  categoryKey: string;         // → CaptureCategory.key (where sensitive === true)
  label: string;               // "Sample records"
  enabled: boolean;            // default false
  meta?: string;               // "redacted · max 25", "Off by default"
  limit?: number;              // e.g. sample records max (default 25)
}

// ────────────────────────────────────────────────────────────
// 8. ScanRun  (a single execution — becomes History row)
// ────────────────────────────────────────────────────────────
interface ScanRun {
  id: Id;                      // "scan_20260702_1035"
  projectId: Id;
  siteId: Id;
  authProfileId: Id;
  presetId: PresetId;
  selectedAppIds: Id[];
  enabledCategoryKeys: string[];
  sensitiveOptions: SensitiveCaptureOption[];
  startedAt: ISODateString;
  finishedAt?: ISODateString;
  status: ResultStatus | 'running';
  snapshotId?: Id;             // set when a snapshot was written (success or partial)
  result?: ScanResult;         // present once finished
  canceledByUser?: boolean;
}

// ────────────────────────────────────────────────────────────
// 9. ScanResult  (summary of a finished run)
// ────────────────────────────────────────────────────────────
interface ScanResult {
  status: ResultStatus;
  durationMs: number;
  requiredOk: number;          // e.g. 68
  requiredTotal: number;       // e.g. 68  (status='completed' ⇒ requiredOk===requiredTotal)
  optionalSkipped: number;     // e.g. 1
  warningCount: number;        // e.g. 2
  appsCaptured: number;
  pluginsCaptured: number;
  redaction: RedactionSummary;
  collectors: CollectorResult[];
  error?: ErrorStateModel;     // present only when status='failed'
  partialSummaryPath?: string; // relative path to partial summary (failed/partial runs)
}

// ────────────────────────────────────────────────────────────
// 10. CollectorResult  (per-collector outcome)
// ────────────────────────────────────────────────────────────
interface CollectorResult {
  key: string;                 // "rest.form_fields", "browser.plugin_config"
  label: string;               // "Browser · plugin saved config"
  kind: CollectorKind;         // required | optional
  status: CollectorStatus;     // done | skipped | failed | ...
  appId?: Id;                  // if scoped to one app
  message?: string;            // "runtime unavailable — optional, continuing"
}

// ────────────────────────────────────────────────────────────
// 11. SnapshotManifest  (written into each snapshot folder — the source of truth)
// ────────────────────────────────────────────────────────────
interface SnapshotManifest {
  snapshotId: Id;              // "snap_20260702_1035"
  scanRunId: Id;
  projectId: Id;
  siteId: Id;
  siteDomain: string;
  authProfileId: Id;
  schemaVersion: number;
  capturedAt: ISODateString;
  status: ResultStatus;        // 'failed' snapshots are partial (kept for inspection)
  isCurrent: boolean;          // exactly one current per project (mirror of pointer)
  presetId: PresetId;
  enabledCategoryKeys: string[];
  appIds: Id[];
  counts: { apps: number; plugins: number; files: number; records: number };
  sizeBytesOnDisk: number;
  integrity: { verified: boolean; algorithm: 'sha256'; checkedAt: ISODateString };
  fileOrder: FileOrderItem[];  // execution-order metadata lives HERE
  redaction: RedactionSummary;
  reports: ReportItem[];       // generated views (paths relative to snapshot)
  developerFiles: DeveloperFileItem[];
}

// ────────────────────────────────────────────────────────────
// 12. SnapshotSummary  (lightweight index entry for UI lists / History)
// ────────────────────────────────────────────────────────────
interface SnapshotSummary {
  id: Id;
  scanRunId: Id;
  projectId: Id;
  siteId: Id;
  capturedAt: ISODateString;
  status: ResultStatus;
  isCurrent: boolean;
  sizeBytesOnDisk: number;
  counts: { apps: number; plugins: number; redactions: number };
  requiredOk: number; requiredTotal: number;
  optionalSkipped: number; warningCount: number;
  folderPath: string;          // relative to the project folder
}

// ────────────────────────────────────────────────────────────
// 13. ReportItem  (a generated, human-readable view of the snapshot)
// ────────────────────────────────────────────────────────────
interface ReportItem {
  key: 'site_summary' | 'apps_summary' | 'plugins_summary' | 'dependency_report' | 'scan_report';
  title: string;               // "Site summary"
  description: string;         // plain-language
  filePath: string;            // relative to snapshot/reports (markdown)
  freshness: Freshness;        // vs the snapshot it derives from
  generatedAt?: ISODateString;
}

// ────────────────────────────────────────────────────────────
// 14. DeveloperFileItem  (advanced/structured output view)
// ────────────────────────────────────────────────────────────
interface DeveloperFileItem {
  key: string;                 // "structured_data", "export_manifest"
  fileName: string;            // "structured-data.jsonl"
  filePath: string;            // relative to snapshot/developer-files
  sizeBytes: number;
  recordCount?: number;
  redacted: boolean;
  mimeType: string;            // "application/x-ndjson", "application/json"
}

// ────────────────────────────────────────────────────────────
// 15. FileOrderItem  (customization JS/CSS execution order — stored in manifest)
// ────────────────────────────────────────────────────────────
interface FileOrderItem {
  appId: Id;
  scope: 'desktop_js' | 'desktop_css' | 'mobile_js' | 'mobile_css';
  orderIndex: number;          // 1-based execution order — NEVER re-sorted A–Z
  fileName: string;            // "001-common.js"
  filePath: string;            // relative to snapshot/developer-files/customization
  orderSource: OrderSource;    // where the order came from
  confidence: Confidence;      // trust indicator surfaced in UI
}

// ────────────────────────────────────────────────────────────
// 16. RedactionSummary
// ────────────────────────────────────────────────────────────
interface RedactionSummary {
  enabled: true;               // locked on for MVP 1
  totalRedactions: number;     // e.g. 4
  byType: { fieldValues: number; comments: number; attachments: number; other: number };
  logPath: string;             // relative path to redaction log (see storage spec)
}

// ────────────────────────────────────────────────────────────
// 17. ErrorStateModel  (drives ErrorState component; code is support-only)
// ────────────────────────────────────────────────────────────
interface ErrorStateModel {
  code: ErrorCode;             // small pill, never the headline
  title: string;               // human headline
  body: string;                // plain-language explanation + reassurance
  tone: 'warn' | 'danger';
  actions: { label: string; actionKey: string; primary?: boolean }[];
  partialDataKept?: boolean;   // true ⇒ mention partial capture is available
}
```

## Cross-model rules
1. `ScanResult.status === 'completed'` **requires** `requiredOk === requiredTotal`. Any required failure ⇒ `'failed'`. Optional skips only ⇒ `'completed_with_warnings'`.
2. Exactly one `SnapshotSummary.isCurrent === true` per project — mirrors the current-snapshot pointer (see `SNAPSHOT_STORAGE_SPEC.md`).
3. `FileOrderItem[]` is authored into `SnapshotManifest.fileOrder`; Developer Files renders it verbatim, ordered by `orderIndex`, never alphabetized.
4. `AuthProfile` records are global app-level profiles. Projects do not own or duplicate profiles; Projects select them by `authProfileId`.
5. `ConnectedSite` records do not own auth profiles. A connection test or scan always uses a Project's selected `siteId` + `authProfileId` pair.
6. No model exposes secrets. `AuthProfile` carries `credentialStatus` + `keychainRef` only.
7. `ReportItem` / `DeveloperFileItem` paths are always relative to their snapshot — they are views generated from it, not independent artifacts.
