import { STORAGE_SCHEMA_VERSION } from "./constants.js";
import type {
  AppSummary,
  AuthProfile,
  ConnectedSite,
  Id,
  Project,
  ProjectAuthSelection,
  ValidationIssue,
  ValidationResult,
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

export function createLocalId(prefix: string, source: string): Id {
  const normalizedPrefix = prefix.toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "id";
  const normalizedSource =
    source
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "local";
  return `${normalizedPrefix}_${normalizedSource}`;
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
  if (!["in_snapshot", "not_captured", "last_scan_warning"].includes(app.captureStatus)) {
    issues.push({ path: `${path}.captureStatus`, code: "invalid_status", message: "App capture status is invalid." });
  }

  return collect(app, issues);
}
