import { STORAGE_SCHEMA_VERSION } from "./constants.js";
import type {
  AppIndex,
  AppIndexEntry,
  AppSummary,
  AuthProfile,
  ConnectedSite,
  CurrentSnapshotPointer,
  Id,
  Project,
  ProjectAppList,
  ProjectAuthSelection,
  ProjectHistory,
  ProjectScanDraftSnapshot,
  ProjectScanPresetDraftSnapshot,
  ProjectTabSnapshot,
  SensitiveCaptureOption,
  ValidationIssue,
  ValidationResult,
  WindowStateSnapshot,
} from "./types.js";

function ok<T>(value: T): ValidationResult<T> {
  return { ok: true, value, issues: [] };
}

function fail<T = never>(path: string, code: string, message: string): ValidationResult<T> {
  return { ok: false, issues: [{ path, code, message }] };
}

function collect<T>(value: T, issues: ValidationIssue[]): ValidationResult<T> {
  return issues.length === 0 ? ok(value) : { ok: false, issues };
}

export function validateLocalId(value: unknown, path = "id"): ValidationResult<Id> {
  if (typeof value !== "string") {
    return fail(path, "invalid_type", "ID must be a string.");
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(trimmed)) {
    return fail(path, "invalid_id", "ID must use letters, numbers, underscore, or hyphen.");
  }

  return ok(trimmed);
}

export interface LocalIdOptions {
  now?: () => Date;
  random?: () => number;
  suffix?: string;
}

function normalizeLocalIdPart(value: string, fallback: string, maxLength: number): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, maxLength) || fallback;
}

function defaultLocalIdSuffix(options: LocalIdOptions): string {
  if (options.suffix) {
    return normalizeLocalIdPart(options.suffix, "local", 32);
  }

  const date = options.now?.() ?? new Date();
  const timestamp = date.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14) || "local";
  const randomValue = Math.floor((options.random?.() ?? Math.random()) * 36 ** 5)
    .toString(36)
    .padStart(5, "0")
    .slice(0, 5);
  return `${timestamp}_${randomValue}`;
}

export function createCollisionSafeLocalId(prefix: string, source: string, existingIds: Iterable<string> = [], options: LocalIdOptions = {}): Id {
  const normalizedPrefix = prefix.toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "id";
  const normalizedSource = normalizeLocalIdPart(source, "local", 64);
  const suffix = defaultLocalIdSuffix(options);
  const existing = new Set(existingIds);
  const base = `${normalizedPrefix}_${normalizedSource}_${suffix}`.slice(0, 120).replace(/_+$/g, "");

  let candidate = base;
  let counter = 2;
  while (existing.has(candidate)) {
    candidate = `${base}_${counter}`.slice(0, 128);
    counter += 1;
  }

  return candidate;
}

export function createLocalId(prefix: string, source: string, options: LocalIdOptions = {}): Id {
  return createCollisionSafeLocalId(prefix, source, [], options);
}

export function validateKintoneDomain(value: unknown, path = "domain"): ValidationResult<string> {
  if (typeof value !== "string") {
    return fail(path, "invalid_type", "Domain must be a string.");
  }

  const domain = value.trim().toLowerCase();
  if (domain.length === 0) {
    return fail(path, "required", "Domain is required.");
  }
  if (/^https?:\/\//i.test(domain)) {
    return fail(path, "domain_has_scheme", "Use the domain only, without http:// or https://.");
  }
  if (domain.includes("/") || domain.includes("@") || domain.includes(":")) {
    return fail(path, "invalid_domain", "Domain must not include a path, credentials, or port.");
  }
  if (!/^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/.test(domain)) {
    return fail(path, "invalid_domain", "Domain must be a valid host name.");
  }

  return ok(domain);
}

const reservedWindowsNames = new Set(["con", "prn", "aux", "nul", "clock$", "com1", "com2", "com3", "com4", "com5", "com6", "com7", "com8", "com9", "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9"]);

export function validateProjectName(value: unknown, path = "name"): ValidationResult<string> {
  if (typeof value !== "string") {
    return fail(path, "invalid_type", "Project name must be a string.");
  }

  const name = value.trim();
  if (name.length === 0) {
    return fail(path, "required", "Project name is required.");
  }
  if (name.length > 80) {
    return fail(path, "too_long", "Project name must be 80 characters or fewer.");
  }
  if (/[<>:"/\\|?*\u0000-\u001f]/.test(name)) {
    return fail(path, "windows_unsafe_name", "Project name contains characters Windows cannot use in folder names.");
  }
  if (/[ .]$/.test(name)) {
    return fail(path, "windows_unsafe_name", "Project name must not end with a space or period.");
  }
  if (reservedWindowsNames.has(name.toLowerCase())) {
    return fail(path, "reserved_name", "Project name is reserved on Windows.");
  }

  return ok(name);
}

export function validateWindowsSafeLocalPath(value: unknown, path = "folderPath"): ValidationResult<string> {
  if (typeof value !== "string") {
    return fail(path, "invalid_type", "Folder path must be a string.");
  }

  const folderPath = value.trim();
  if (folderPath.length === 0) {
    return fail(path, "required", "Folder path is required.");
  }
  if (folderPath.startsWith("~")) {
    return fail(path, "relative_path", "Folder path must be an absolute local path.");
  }
  if (!/^[A-Za-z]:\\/.test(folderPath) && !/^\\\\[^\\]+\\[^\\]+/.test(folderPath)) {
    return fail(path, "not_absolute", "Folder path must be an absolute Windows path.");
  }
  if (/[\u0000-\u001f]/.test(folderPath)) {
    return fail(path, "control_character", "Folder path contains a control character.");
  }

  const withoutRoot = folderPath.replace(/^[A-Za-z]:\\/, "").replace(/^\\\\[^\\]+\\[^\\]+\\?/, "");
  const segments = withoutRoot.split(/[\\/]+/).filter(Boolean);
  const badSegment = segments.find((segment) => {
    const base = segment.split(".")[0]?.toLowerCase() ?? segment.toLowerCase();
    return segment === "." || segment === ".." || /[<>:"|?*]/.test(segment) || /[ .]$/.test(segment) || reservedWindowsNames.has(base);
  });

  if (badSegment) {
    return fail(path, "windows_unsafe_path", `Folder path segment "${badSegment}" is not Windows-safe.`);
  }

  return ok(folderPath);
}

export function validateAppSelection(selectedAppIds: unknown, availableAppIds: Id[], path = "selectedAppIds"): ValidationResult<Id[]> {
  if (!Array.isArray(selectedAppIds)) {
    return fail(path, "invalid_type", "Selected apps must be an array.");
  }

  const issues: ValidationIssue[] = [];
  const available = new Set(availableAppIds);
  const deduped: Id[] = [];

  selectedAppIds.forEach((id, index) => {
    const idResult = validateLocalId(id, `${path}[${index}]`);
    if (!idResult.ok) {
      issues.push(...idResult.issues);
      return;
    }
    if (!available.has(idResult.value)) {
      issues.push({ path: `${path}[${index}]`, code: "unknown_app", message: "Selected app is not in the app list." });
      return;
    }
    if (!deduped.includes(idResult.value)) {
      deduped.push(idResult.value);
    }
  });

  if (deduped.length === 0) {
    issues.push({ path, code: "empty_selection", message: "Select at least one app before scanning." });
  }

  return collect(deduped, issues);
}

export function validateProjectAuthSelection(value: unknown, path = "authSelection"): ValidationResult<ProjectAuthSelection> {
  if (!value || typeof value !== "object") {
    return fail(path, "invalid_type", "Auth selection must be an object.");
  }

  const auth = value as ProjectAuthSelection;
  if (auth.kind === "global_profile") {
    const idResult = validateLocalId(auth.authProfileId, `${path}.authProfileId`);
    return idResult.ok ? ok(auth) : { ok: false, issues: idResult.issues };
  }

  if (auth.kind !== "project_local") {
    return fail(`${path}.kind`, "invalid_auth_kind", "Auth selection must be global_profile or project_local.");
  }

  const issues: ValidationIssue[] = [];
  if (typeof auth.displayName !== "string" || auth.displayName.trim().length === 0) {
    issues.push({ path: `${path}.displayName`, code: "required", message: "Project-local auth display name is required." });
  }
  if (typeof auth.username !== "string" || auth.username.trim().length === 0) {
    issues.push({ path: `${path}.username`, code: "required", message: "Project-local auth username is required." });
  }
  if (auth.authType !== "password") {
    issues.push({ path: `${path}.authType`, code: "invalid_auth_type", message: "MVP 1 auth type must be password." });
  }
  if (!["saved", "needs_update", "no_credential", "invalid"].includes(auth.credentialStatus)) {
    issues.push({ path: `${path}.credentialStatus`, code: "invalid_status", message: "Credential status is invalid." });
  }
  if (auth.keychainRef !== undefined && (typeof auth.keychainRef !== "string" || auth.keychainRef.trim().length === 0)) {
    issues.push({ path: `${path}.keychainRef`, code: "invalid_type", message: "Keychain reference must be a non-empty string when present." });
  }

  return collect(auth, issues);
}

export function validateConnectedSite(value: unknown, path = "connectedSite"): ValidationResult<ConnectedSite> {
  if (!value || typeof value !== "object") {
    return fail(path, "invalid_type", "Connected site must be an object.");
  }

  const site = value as ConnectedSite;
  const issues: ValidationIssue[] = [];
  const idResult = validateLocalId(site.id, `${path}.id`);
  const domainResult = validateKintoneDomain(site.domain, `${path}.domain`);
  if (!idResult.ok) issues.push(...idResult.issues);
  if (!domainResult.ok) issues.push(...domainResult.issues);
  if (typeof site.displayName !== "string" || site.displayName.trim().length === 0) {
    issues.push({ path: `${path}.displayName`, code: "required", message: "Connected site display name is required." });
  }
  if (site.savedStatus !== "saved" && site.savedStatus !== "unused") {
    issues.push({ path: `${path}.savedStatus`, code: "invalid_status", message: "Saved status is invalid." });
  }
  if (!Array.isArray(site.linkedProjectIds)) {
    issues.push({ path: `${path}.linkedProjectIds`, code: "invalid_type", message: "Linked project IDs must be an array." });
  } else {
    issues.push(...validateLocalIdArray(site.linkedProjectIds, `${path}.linkedProjectIds`));
  }
  if (!isIsoDateString(site.createdAt)) {
    issues.push({ path: `${path}.createdAt`, code: "invalid_timestamp", message: "Connected site creation timestamp must be ISO 8601." });
  }

  return collect(site, issues);
}

export function validateAuthProfile(value: unknown, path = "authProfile"): ValidationResult<AuthProfile> {
  if (!value || typeof value !== "object") {
    return fail(path, "invalid_type", "Auth profile must be an object.");
  }

  const profile = value as AuthProfile;
  const issues: ValidationIssue[] = [];
  const idResult = validateLocalId(profile.id, `${path}.id`);
  if (!idResult.ok) issues.push(...idResult.issues);
  if (typeof profile.displayName !== "string" || profile.displayName.trim().length === 0) {
    issues.push({ path: `${path}.displayName`, code: "required", message: "Auth profile display name is required." });
  }
  if (typeof profile.username !== "string" || profile.username.trim().length === 0) {
    issues.push({ path: `${path}.username`, code: "required", message: "Username is required." });
  }
  if (profile.authType !== "password") {
    issues.push({ path: `${path}.authType`, code: "invalid_auth_type", message: "MVP 1 auth type must be password." });
  }
  if (typeof profile.keychainRef !== "string" || profile.keychainRef.trim().length === 0) {
    issues.push({ path: `${path}.keychainRef`, code: "required", message: "Auth profile needs an opaque keychain reference." });
  }
  if (!Array.isArray(profile.linkedProjectIds)) {
    issues.push({ path: `${path}.linkedProjectIds`, code: "invalid_type", message: "Linked project IDs must be an array." });
  } else {
    issues.push(...validateLocalIdArray(profile.linkedProjectIds, `${path}.linkedProjectIds`));
  }
  if (!["saved", "needs_update", "no_credential", "invalid"].includes(profile.credentialStatus)) {
    issues.push({ path: `${path}.credentialStatus`, code: "invalid_status", message: "Credential status is invalid." });
  }
  if (profile.lastTestedAt !== undefined && !isIsoDateString(profile.lastTestedAt)) {
    issues.push({ path: `${path}.lastTestedAt`, code: "invalid_timestamp", message: "Last tested timestamp must be ISO 8601." });
  }

  return collect(profile, issues);
}

export function validateProject(value: unknown, path = "project"): ValidationResult<Project> {
  if (!value || typeof value !== "object") {
    return fail(path, "invalid_type", "Project must be an object.");
  }

  const project = value as Project;
  const issues: ValidationIssue[] = [];
  const idResult = validateLocalId(project.id, `${path}.id`);
  const nameResult = validateProjectName(project.name, `${path}.name`);
  const folderResult = validateWindowsSafeLocalPath(project.folderPath, `${path}.folderPath`);
  const siteIdResult = validateLocalId(project.siteId, `${path}.siteId`);
  const authResult = validateProjectAuthSelection(project.authSelection, `${path}.authSelection`);

  if (!idResult.ok) issues.push(...idResult.issues);
  if (!nameResult.ok) issues.push(...nameResult.issues);
  if (!folderResult.ok) issues.push(...folderResult.issues);
  if (!siteIdResult.ok) issues.push(...siteIdResult.issues);
  if (!authResult.ok) issues.push(...authResult.issues);
  if (!isIsoDateString(project.createdAt)) {
    issues.push({ path: `${path}.createdAt`, code: "invalid_timestamp", message: "Project creation timestamp must be ISO 8601." });
  }
  if (!isIsoDateString(project.lastOpenedAt)) {
    issues.push({ path: `${path}.lastOpenedAt`, code: "invalid_timestamp", message: "Project last-opened timestamp must be ISO 8601." });
  }
  if (project.schemaVersion !== STORAGE_SCHEMA_VERSION) {
    issues.push({ path: `${path}.schemaVersion`, code: "unsupported_schema_version", message: "Project schema version is unsupported." });
  }

  return collect(project, issues);
}

export function validateAppSummary(value: unknown, path = "app"): ValidationResult<AppSummary> {
  if (!value || typeof value !== "object") {
    return fail(path, "invalid_type", "App summary must be an object.");
  }

  const app = value as AppSummary;
  const issues: ValidationIssue[] = [];
  const idResult = validateLocalId(app.id, `${path}.id`);
  if (!idResult.ok) issues.push(...idResult.issues);
  if (!Number.isInteger(app.kintoneAppId) || app.kintoneAppId <= 0) {
    issues.push({ path: `${path}.kintoneAppId`, code: "invalid_app_id", message: "kintone app ID must be a positive integer." });
  }
  if (typeof app.name !== "string" || app.name.trim().length === 0) {
    issues.push({ path: `${path}.name`, code: "required", message: "App name is required." });
  }
  if (app.spaceName !== undefined && (typeof app.spaceName !== "string" || app.spaceName.trim().length === 0)) {
    issues.push({ path: `${path}.spaceName`, code: "required", message: "Space name must be a non-empty string when present." });
  }
  if (typeof app.isGuestSpace !== "boolean") {
    issues.push({ path: `${path}.isGuestSpace`, code: "invalid_type", message: "Guest-space flag must be a boolean." });
  }
  if (typeof app.hasPlugins !== "boolean") {
    issues.push({ path: `${path}.hasPlugins`, code: "invalid_type", message: "Plugin flag must be a boolean." });
  }
  if (typeof app.hasCustomization !== "boolean") {
    issues.push({ path: `${path}.hasCustomization`, code: "invalid_type", message: "Customization flag must be a boolean." });
  }
  if (!["in_snapshot", "not_captured", "last_scan_warning"].includes(app.captureStatus)) {
    issues.push({ path: `${path}.captureStatus`, code: "invalid_status", message: "App capture status is invalid." });
  }
  if (app.lastCapturedAt !== undefined && !isIsoDateString(app.lastCapturedAt)) {
    issues.push({ path: `${path}.lastCapturedAt`, code: "invalid_timestamp", message: "Last captured timestamp must be ISO 8601." });
  }

  return collect(app, issues);
}

export function validateConnectedSiteList(value: unknown, path = "connectedSites"): ValidationResult<ConnectedSite[]> {
  if (!Array.isArray(value)) {
    return fail(path, "invalid_type", "Connected sites must be an array.");
  }

  const issues: ValidationIssue[] = [];
  value.forEach((site, index) => {
    const result = validateConnectedSite(site, `${path}[${index}]`);
    if (!result.ok) issues.push(...result.issues);
  });
  return collect(value as ConnectedSite[], issues);
}

export function validateAuthProfileList(value: unknown, path = "authProfiles"): ValidationResult<AuthProfile[]> {
  if (!Array.isArray(value)) {
    return fail(path, "invalid_type", "Auth profiles must be an array.");
  }

  const issues: ValidationIssue[] = [];
  value.forEach((profile, index) => {
    const result = validateAuthProfile(profile, `${path}[${index}]`);
    if (!result.ok) issues.push(...result.issues);
  });
  return collect(value as AuthProfile[], issues);
}

export function validateProjectAppList(value: unknown, path = "appList"): ValidationResult<ProjectAppList> {
  if (!value || typeof value !== "object") {
    return fail(path, "invalid_type", "App list metadata must be an object.");
  }

  const appList = value as ProjectAppList;
  const issues: ValidationIssue[] = [];
  if (appList.schemaVersion !== STORAGE_SCHEMA_VERSION) {
    issues.push({ path: `${path}.schemaVersion`, code: "unsupported_schema_version", message: "App list schema version is unsupported." });
  }
  if (appList.appListFetchedAt !== null && !isIsoDateString(appList.appListFetchedAt)) {
    issues.push({ path: `${path}.appListFetchedAt`, code: "invalid_timestamp", message: "App list fetched timestamp must be ISO 8601 or null." });
  }
  if (!Array.isArray(appList.apps)) {
    issues.push({ path: `${path}.apps`, code: "invalid_type", message: "App list apps must be an array." });
  } else {
    appList.apps.forEach((app, index) => {
      const result = validateAppSummary(app, `${path}.apps[${index}]`);
      if (!result.ok) issues.push(...result.issues);
    });
  }
  if (appList.selectedAppIds !== undefined) {
    if (!Array.isArray(appList.selectedAppIds)) {
      issues.push({ path: `${path}.selectedAppIds`, code: "invalid_type", message: "Selected app IDs must be an array when present." });
    } else {
      issues.push(...validateLocalIdArray(appList.selectedAppIds, `${path}.selectedAppIds`));
      if (Array.isArray(appList.apps)) {
        const availableIds = new Set(appList.apps.map((app) => (typeof app === "object" && app !== null ? (app as AppSummary).id : undefined)));
        appList.selectedAppIds.forEach((appId, index) => {
          if (typeof appId === "string" && !availableIds.has(appId)) {
            issues.push({ path: `${path}.selectedAppIds[${index}]`, code: "unknown_app", message: "Selected app ID is not present in the app list." });
          }
        });
      }
    }
  }

  return collect(appList, issues);
}

export function validateCurrentSnapshotPointer(value: unknown, path = "current"): ValidationResult<CurrentSnapshotPointer> {
  if (!value || typeof value !== "object") {
    return fail(path, "invalid_type", "Current snapshot pointer must be an object.");
  }

  const current = value as CurrentSnapshotPointer;
  const issues: ValidationIssue[] = [];
  const projectId = validateLocalId(current.projectId, `${path}.projectId`);
  const siteId = validateLocalId(current.siteId, `${path}.siteId`);
  if (!projectId.ok) issues.push(...projectId.issues);
  if (!siteId.ok) issues.push(...siteId.issues);
  if (current.currentSnapshotId !== null) {
    const snapshotId = validateLocalId(current.currentSnapshotId, `${path}.currentSnapshotId`);
    if (!snapshotId.ok) issues.push(...snapshotId.issues);
  }
  if (current.currentSnapshotPath !== null && !isSafeRelativePath(current.currentSnapshotPath)) {
    issues.push({ path: `${path}.currentSnapshotPath`, code: "invalid_path", message: "Current snapshot path must be a safe relative path or null." });
  }
  if (current.updatedAt !== null && !isIsoDateString(current.updatedAt)) {
    issues.push({ path: `${path}.updatedAt`, code: "invalid_timestamp", message: "Current pointer timestamp must be ISO 8601 or null." });
  }

  return collect(current, issues);
}

export function validateProjectHistory(value: unknown, path = "history"): ValidationResult<ProjectHistory> {
  if (!value || typeof value !== "object") {
    return fail(path, "invalid_type", "History metadata must be an object.");
  }

  const history = value as ProjectHistory;
  const issues: ValidationIssue[] = [];
  if (history.schemaVersion !== STORAGE_SCHEMA_VERSION) {
    issues.push({ path: `${path}.schemaVersion`, code: "unsupported_schema_version", message: "History schema version is unsupported." });
  }
  if (!Array.isArray(history.runs)) {
    issues.push({ path: `${path}.runs`, code: "invalid_type", message: "History runs must be an array." });
  }

  return collect(history, issues);
}

export function validateAppIndex(value: unknown, path = "appIndex"): ValidationResult<AppIndex> {
  if (!value || typeof value !== "object") {
    return fail(path, "invalid_type", "App index metadata must be an object.");
  }

  const appIndex = value as AppIndex;
  const issues: ValidationIssue[] = [];
  if (appIndex.schemaVersion !== STORAGE_SCHEMA_VERSION) {
    issues.push({ path: `${path}.schemaVersion`, code: "unsupported_schema_version", message: "App index schema version is unsupported." });
  }
  if (!Array.isArray(appIndex.recentProjects)) {
    issues.push({ path: `${path}.recentProjects`, code: "invalid_type", message: "Recent projects must be an array." });
  } else {
    appIndex.recentProjects.forEach((entry, index) => {
      const result = validateAppIndexEntry(entry, `${path}.recentProjects[${index}]`);
      if (!result.ok) issues.push(...result.issues);
    });
  }

  return collect(appIndex, issues);
}

export function validateWindowStateSnapshot(value: unknown, path = "windowState"): ValidationResult<WindowStateSnapshot> {
  if (!value || typeof value !== "object") {
    return fail(path, "invalid_type", "Window state metadata must be an object.");
  }

  const state = value as WindowStateSnapshot;
  const issues: ValidationIssue[] = [];
  if (!Array.isArray(state.openProjectTabs)) {
    issues.push({ path: `${path}.openProjectTabs`, code: "invalid_type", "message": "Open project tabs must be an array." });
  } else {
    state.openProjectTabs.forEach((tab, index) => {
      const result = validateProjectTabSnapshot(tab, `${path}.openProjectTabs[${index}]`);
      if (!result.ok) issues.push(...result.issues);
    });
  }
  if (state.activeTabId !== "home") {
    const activeId = validateLocalId(state.activeTabId, `${path}.activeTabId`);
    if (!activeId.ok) issues.push(...activeId.issues);
    if (Array.isArray(state.openProjectTabs) && !state.openProjectTabs.some((tab) => tab.id === state.activeTabId)) {
      issues.push({ path: `${path}.activeTabId`, code: "unknown_tab", message: "Active tab must be Home or one of the open project tabs." });
    }
  }
  if (typeof state.restored !== "boolean") {
    issues.push({ path: `${path}.restored`, code: "invalid_type", message: "Restored flag must be a boolean." });
  }
  if (state.scanDraftsByProjectId !== undefined) {
    if (!state.scanDraftsByProjectId || typeof state.scanDraftsByProjectId !== "object" || Array.isArray(state.scanDraftsByProjectId)) {
      issues.push({ path: `${path}.scanDraftsByProjectId`, code: "invalid_type", message: "Scan drafts must be stored by project ID." });
    } else {
      Object.entries(state.scanDraftsByProjectId).forEach(([projectId, draft]) => {
        const projectIdResult = validateLocalId(projectId, `${path}.scanDraftsByProjectId.${projectId}`);
        if (!projectIdResult.ok) issues.push(...projectIdResult.issues);
        const draftResult = validateProjectScanDraftSnapshot(draft, `${path}.scanDraftsByProjectId.${projectId}`);
        if (!draftResult.ok) issues.push(...draftResult.issues);
      });
    }
  }

  return collect(state, issues);
}

function validateAppIndexEntry(value: unknown, path: string): ValidationResult<AppIndexEntry> {
  if (!value || typeof value !== "object") {
    return fail(path, "invalid_type", "Recent project entry must be an object.");
  }

  const entry = value as AppIndexEntry;
  const issues: ValidationIssue[] = [];
  const projectId = validateLocalId(entry.projectId, `${path}.projectId`);
  const name = validateProjectName(entry.name, `${path}.name`);
  const folder = validateWindowsSafeLocalPath(entry.folderPath, `${path}.folderPath`);
  const siteId = validateLocalId(entry.siteId, `${path}.siteId`);
  if (!projectId.ok) issues.push(...projectId.issues);
  if (!name.ok) issues.push(...name.issues);
  if (!folder.ok) issues.push(...folder.issues);
  if (!siteId.ok) issues.push(...siteId.issues);
  if (!isIsoDateString(entry.lastOpenedAt)) {
    issues.push({ path: `${path}.lastOpenedAt`, code: "invalid_timestamp", message: "Last opened timestamp must be ISO 8601." });
  }

  return collect(entry, issues);
}

function validateProjectTabSnapshot(value: unknown, path: string): ValidationResult<ProjectTabSnapshot> {
  if (!value || typeof value !== "object") {
    return fail(path, "invalid_type", "Project tab must be an object.");
  }

  const tab = value as ProjectTabSnapshot;
  const issues: ValidationIssue[] = [];
  const id = validateLocalId(tab.id, `${path}.id`);
  if (!id.ok) issues.push(...id.issues);
  if (tab.projectId !== undefined) {
    const projectId = validateLocalId(tab.projectId, `${path}.projectId`);
    if (!projectId.ok) issues.push(...projectId.issues);
  }
  if (typeof tab.title !== "string" || tab.title.trim().length === 0) {
    issues.push({ path: `${path}.title`, code: "required", message: "Project tab title is required." });
  }
  if (typeof tab.routePath !== "string" || !tab.routePath.startsWith("/") || tab.routePath.includes("\u0000")) {
    issues.push({ path: `${path}.routePath`, code: "invalid_route", message: "Project tab route must be an app route path." });
  }

  return collect(tab, issues);
}

function validateProjectScanDraftSnapshot(value: unknown, path: string): ValidationResult<ProjectScanDraftSnapshot> {
  if (!value || typeof value !== "object") {
    return fail(path, "invalid_type", "Project scan draft must be an object.");
  }

  const draft = value as ProjectScanDraftSnapshot;
  const issues: ValidationIssue[] = [];
  if (!isPresetId(draft.presetId)) {
    issues.push({ path: `${path}.presetId`, code: "invalid_preset", message: "Scan preset is invalid." });
  }
  if (!Array.isArray(draft.enabledCategoryKeys)) {
    issues.push({ path: `${path}.enabledCategoryKeys`, code: "invalid_type", message: "Enabled scan categories must be an array." });
  } else {
    issues.push(...validateCategoryKeyArray(draft.enabledCategoryKeys, `${path}.enabledCategoryKeys`));
  }
  if (!Array.isArray(draft.sensitiveOptions)) {
    issues.push({ path: `${path}.sensitiveOptions`, code: "invalid_type", message: "Sensitive scan options must be an array." });
  } else {
    draft.sensitiveOptions.forEach((option, index) => {
      const result = validateSensitiveCaptureOption(option, `${path}.sensitiveOptions[${index}]`);
      if (!result.ok) issues.push(...result.issues);
    });
  }
  if (draft.hydratedFromRunId !== undefined) {
    const runId = validateLocalId(draft.hydratedFromRunId, `${path}.hydratedFromRunId`);
    if (!runId.ok) issues.push(...runId.issues);
  }
  if (draft.dirty !== undefined && typeof draft.dirty !== "boolean") {
    issues.push({ path: `${path}.dirty`, code: "invalid_type", message: "Scan draft dirty flag must be a boolean." });
  }
  if (draft.errorMode !== undefined && !isPersistedScanErrorMode(draft.errorMode)) {
    issues.push({ path: `${path}.errorMode`, code: "invalid_error_mode", message: "Scan error mode is invalid." });
  }
  if (draft.presetDrafts !== undefined) {
    if (!draft.presetDrafts || typeof draft.presetDrafts !== "object" || Array.isArray(draft.presetDrafts)) {
      issues.push({ path: `${path}.presetDrafts`, code: "invalid_type", message: "Preset scan drafts must be an object." });
    } else {
      Object.entries(draft.presetDrafts).forEach(([presetId, presetDraft]) => {
        if (!isPresetId(presetId)) {
          issues.push({ path: `${path}.presetDrafts.${presetId}`, code: "invalid_preset", message: "Scan preset is invalid." });
          return;
        }
        const result = validateProjectScanPresetDraftSnapshot(presetDraft, `${path}.presetDrafts.${presetId}`);
        if (!result.ok) issues.push(...result.issues);
      });
    }
  }

  return collect(draft, issues);
}

function validateProjectScanPresetDraftSnapshot(value: unknown, path: string): ValidationResult<ProjectScanPresetDraftSnapshot> {
  if (!value || typeof value !== "object") {
    return fail(path, "invalid_type", "Preset scan draft must be an object.");
  }

  const draft = value as ProjectScanPresetDraftSnapshot;
  const issues: ValidationIssue[] = [];
  if (!Array.isArray(draft.enabledCategoryKeys)) {
    issues.push({ path: `${path}.enabledCategoryKeys`, code: "invalid_type", message: "Enabled scan categories must be an array." });
  } else {
    issues.push(...validateCategoryKeyArray(draft.enabledCategoryKeys, `${path}.enabledCategoryKeys`));
  }
  if (!Array.isArray(draft.sensitiveOptions)) {
    issues.push({ path: `${path}.sensitiveOptions`, code: "invalid_type", message: "Sensitive scan options must be an array." });
  } else {
    draft.sensitiveOptions.forEach((option, index) => {
      const result = validateSensitiveCaptureOption(option, `${path}.sensitiveOptions[${index}]`);
      if (!result.ok) issues.push(...result.issues);
    });
  }
  if (draft.hydratedFromRunId !== undefined) {
    const runId = validateLocalId(draft.hydratedFromRunId, `${path}.hydratedFromRunId`);
    if (!runId.ok) issues.push(...runId.issues);
  }
  if (draft.dirty !== undefined && typeof draft.dirty !== "boolean") {
    issues.push({ path: `${path}.dirty`, code: "invalid_type", message: "Preset scan draft dirty flag must be a boolean." });
  }

  return collect(draft, issues);
}

function validateSensitiveCaptureOption(value: unknown, path: string): ValidationResult<SensitiveCaptureOption> {
  if (!value || typeof value !== "object") {
    return fail(path, "invalid_type", "Sensitive scan option must be an object.");
  }

  const option = value as SensitiveCaptureOption;
  const issues: ValidationIssue[] = [];
  if (!isCategoryKey(option.categoryKey)) {
    issues.push({ path: `${path}.categoryKey`, code: "invalid_category_key", message: "Scan category key is invalid." });
  }
  if (typeof option.label !== "string" || option.label.trim().length === 0) {
    issues.push({ path: `${path}.label`, code: "required", message: "Sensitive scan option label is required." });
  }
  if (typeof option.enabled !== "boolean") {
    issues.push({ path: `${path}.enabled`, code: "invalid_type", message: "Sensitive scan option enabled flag must be a boolean." });
  }
  if (option.meta !== undefined && (typeof option.meta !== "string" || option.meta.includes("\u0000"))) {
    issues.push({ path: `${path}.meta`, code: "invalid_type", message: "Sensitive scan option metadata must be a safe string." });
  }
  if (option.limit !== undefined && (!Number.isInteger(option.limit) || option.limit <= 0)) {
    issues.push({ path: `${path}.limit`, code: "invalid_limit", message: "Sensitive scan option limit must be a positive integer." });
  }

  return collect(option, issues);
}

function validateLocalIdArray(values: unknown[], path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  values.forEach((value, index) => {
    const result = validateLocalId(value, `${path}[${index}]`);
    if (!result.ok) {
      issues.push(...result.issues);
    }
  });
  return issues;
}

function validateCategoryKeyArray(values: unknown[], path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  values.forEach((value, index) => {
    if (!isCategoryKey(value)) {
      issues.push({ path: `${path}[${index}]`, code: "invalid_category_key", message: "Scan category key is invalid." });
    }
  });
  return issues;
}

function isPresetId(value: unknown): value is "quick" | "standard" | "full_discovery" {
  return value === "quick" || value === "standard" || value === "full_discovery";
}

function isPersistedScanErrorMode(value: unknown): value is "pause_on_error" | "continue_on_error" {
  return value === "pause_on_error" || value === "continue_on_error";
}

function isCategoryKey(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);
}

function isIsoDateString(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && /\d{4}-\d{2}-\d{2}T/.test(value);
}

function isSafeRelativePath(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }
  if (/^[A-Za-z]:[\\/]/.test(value) || /^\\\\/.test(value) || value.includes("\u0000")) {
    return false;
  }
  return !value.split(/[\\/]+/).some((segment) => segment === "." || segment === "..");
}
