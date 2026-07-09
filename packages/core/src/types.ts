export type ISODateString = string;
export type Id = string;
export type SchemaVersion = number;

export type ResultStatus = "completed" | "completed_with_warnings" | "failed";
export type ConnectionStatus = "idle" | "testing" | "connected" | "unreachable" | "auth_failed";
export type CredentialStatus = "saved" | "needs_update" | "no_credential" | "invalid";
export type AppCaptureStatus = "in_snapshot" | "not_captured" | "last_scan_warning";
export type Freshness = "up_to_date" | "stale" | "missing";
export type PresetId = "quick" | "standard" | "full_discovery";
export type NavKey =
  | "overview"
  | "apps"
  | "scan"
  | "local_snapshot"
  | "reports"
  | "developer_files"
  | "history"
  | "settings"
  | "advanced_internal_data";
export type CategoryTier = "required" | "recommended" | "additional";
export type CollectorStatus = "done" | "running" | "skipped" | "queued" | "failed";
export type CollectorKind = "required" | "optional";
export type OrderSource = "api" | "inferred" | "manual_fallback";
export type Confidence = "high" | "medium" | "low";
export type AuthType = "password";
export type SavedStatus = "saved" | "unused";

export type ProjectAuthSelection =
  | { kind: "global_profile"; authProfileId: Id }
  | {
      kind: "project_local";
      displayName: string;
      username: string;
      authType: AuthType;
      credentialStatus: CredentialStatus;
      keychainRef?: string;
    };

export type SnapshotAuthSelection =
  | { kind: "global_profile"; authProfileId: Id; displayName?: string }
  | { kind: "project_local"; displayName: string; username: string; authType: AuthType };

export type ErrorCode =
  | "AUTH_FAILED"
  | "SITE_UNREACHABLE"
  | "OUTPUT_WRITE_FAILED"
  | "REQUIRED_COLLECTOR_FAILED"
  | "PERMISSION_DENIED"
  | "SCAN_CANCELED"
  | "REPORT_NOT_FOUND"
  | "SNAPSHOT_INTEGRITY_FAILED"
  | "APP_FETCH_FAILED";

export interface Project {
  id: Id;
  name: string;
  folderPath: string;
  createdAt: ISODateString;
  lastOpenedAt: ISODateString;
  siteId: Id;
  authSelection: ProjectAuthSelection;
  schemaVersion: SchemaVersion;
}

export interface AuthProfile {
  id: Id;
  displayName: string;
  username: string;
  authType: AuthType;
  credentialStatus: CredentialStatus;
  keychainRef: string;
  linkedProjectIds: Id[];
  lastTestedAt?: ISODateString;
}

export interface ConnectedSite {
  id: Id;
  displayName: string;
  domain: string;
  savedStatus: SavedStatus;
  linkedProjectIds: Id[];
  createdAt: ISODateString;
}

export interface AppSummary {
  id: Id;
  kintoneAppId: number;
  name: string;
  spaceName?: string;
  isGuestSpace: boolean;
  hasPlugins: boolean;
  hasCustomization: boolean;
  captureStatus: AppCaptureStatus;
  lastCapturedAt?: ISODateString;
}

export interface ScanPreset {
  id: PresetId;
  name: string;
  description: string;
  isRecommended: boolean;
  includedCategoryKeys: string[];
  opensSensitiveConfig: boolean;
}

export interface CaptureCategory {
  key: string;
  label: string;
  tier: CategoryTier;
  collectorKind: CollectorKind;
  locked: boolean;
  sensitive: boolean;
  defaultEnabled: boolean;
}

export interface SensitiveCaptureOption {
  categoryKey: string;
  label: string;
  enabled: boolean;
  meta?: string;
  limit?: number;
}

export interface ScanRun {
  id: Id;
  projectId: Id;
  siteId: Id;
  authSelection: SnapshotAuthSelection;
  presetId: PresetId;
  selectedAppIds: Id[];
  enabledCategoryKeys: string[];
  sensitiveOptions: SensitiveCaptureOption[];
  startedAt: ISODateString;
  finishedAt?: ISODateString;
  status: ResultStatus | "running";
  snapshotId?: Id;
  result?: ScanResult;
  canceledByUser?: boolean;
}

export interface ScanResult {
  status: ResultStatus;
  durationMs: number;
  requiredOk: number;
  requiredTotal: number;
  optionalSkipped: number;
  warningCount: number;
  appsCaptured: number;
  pluginsCaptured: number;
  redaction: RedactionSummary;
  collectors: CollectorResult[];
  error?: ErrorStateModel;
  partialSummaryPath?: string;
}

export interface CollectorResult {
  key: string;
  label: string;
  kind: CollectorKind;
  status: CollectorStatus;
  appId?: Id;
  message?: string;
}

export interface SnapshotManifest {
  snapshotId: Id;
  scanRunId: Id;
  projectId: Id;
  siteId: Id;
  siteDomain: string;
  authSelection: SnapshotAuthSelection;
  schemaVersion: SchemaVersion;
  capturedAt: ISODateString;
  status: ResultStatus;
  isCurrent: boolean;
  presetId: PresetId;
  enabledCategoryKeys: string[];
  appIds: Id[];
  counts: { apps: number; plugins: number; files: number; records: number };
  sizeBytesOnDisk: number;
  integrity: { verified: boolean; algorithm: "sha256"; checkedAt: ISODateString };
  fileOrder: FileOrderItem[];
  redaction: RedactionSummary;
  reports: ReportItem[];
  developerFiles: DeveloperFileItem[];
}

export interface SnapshotSummary {
  id: Id;
  scanRunId: Id;
  projectId: Id;
  siteId: Id;
  capturedAt: ISODateString;
  status: ResultStatus;
  isCurrent: boolean;
  sizeBytesOnDisk: number;
  counts: { apps: number; plugins: number; redactions: number };
  requiredOk: number;
  requiredTotal: number;
  optionalSkipped: number;
  warningCount: number;
  folderPath: string;
}

export interface ReportItem {
  key: "site_summary" | "apps_summary" | "plugins_summary" | "dependency_report" | "scan_report";
  title: string;
  description: string;
  filePath: string;
  freshness: Freshness;
  generatedAt?: ISODateString;
}

export interface DeveloperFileItem {
  key: string;
  fileName: string;
  filePath: string;
  sizeBytes: number;
  recordCount?: number;
  redacted: boolean;
  mimeType: string;
}

export interface FileOrderItem {
  appId: Id;
  scope: "desktop_js" | "desktop_css" | "mobile_js" | "mobile_css";
  orderIndex: number;
  fileName: string;
  filePath: string;
  orderSource: OrderSource;
  confidence: Confidence;
}

export interface RedactionSummary {
  enabled: true;
  totalRedactions: number;
  byType: { fieldValues: number; comments: number; attachments: number; other: number };
  logPath: string;
}

export interface ErrorStateModel {
  code: ErrorCode;
  title: string;
  body: string;
  tone: "warn" | "danger";
  actions: { label: string; actionKey: string; primary?: boolean }[];
  partialDataKept?: boolean;
}

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export type ValidationResult<T> = { ok: true; value: T; issues: [] } | { ok: false; issues: ValidationIssue[] };

export interface CurrentSnapshotPointer {
  projectId: Id;
  siteId: Id;
  currentSnapshotId: Id | null;
  currentSnapshotPath: string | null;
  updatedAt: ISODateString | null;
}

export interface ProjectAppList {
  schemaVersion: SchemaVersion;
  appListFetchedAt: ISODateString | null;
  apps: AppSummary[];
}

export interface ProjectHistory {
  schemaVersion: SchemaVersion;
  runs: unknown[];
}

export interface AppIndexEntry {
  projectId: Id;
  name: string;
  folderPath: string;
  siteId: Id;
  lastOpenedAt: ISODateString;
}

export interface AppIndex {
  schemaVersion: SchemaVersion;
  recentProjects: AppIndexEntry[];
}

export interface ProjectTabSnapshot {
  id: Id;
  title: string;
  projectId?: Id;
  routePath: string;
}

export interface WindowStateSnapshot {
  openProjectTabs: ProjectTabSnapshot[];
  activeTabId: Id | "home";
  restored: boolean;
}
