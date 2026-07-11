import { CAPTURE_CATEGORIES } from "./constants.js";
import { redactSensitiveData } from "./redaction.js";
import type { AppSummary, CollectorKind, CollectorResult, ErrorStateModel, Id, ISODateString, PresetId, RedactionFinding, RedactionSummary, ResultStatus, ScanResult, SensitiveCaptureOption } from "./types.js";
import { validateKintoneDomain } from "./validators.js";

export type KintoneConnectionStatus = "connected" | "unreachable" | "auth_failed" | "permission_denied" | "invalid_response";

export interface KintonePasswordAuth {
  username: string;
  password: string;
}

export interface KintoneHttpRequest {
  method: "GET";
  url: string;
  headers: Record<string, string>;
}

export interface KintoneHttpResponse {
  status: number;
  ok: boolean;
  bodyText: string;
  headers?: Record<string, string>;
}

export type KintoneHttpTransport = (request: KintoneHttpRequest) => Promise<KintoneHttpResponse>;

export interface KintoneReadOnlyClientOptions {
  domain: string;
  auth: KintonePasswordAuth;
  transport?: KintoneHttpTransport;
  now?: () => Date;
}

export interface KintoneConnectionResult {
  status: KintoneConnectionStatus;
  checkedAt: ISODateString;
  message: string;
  httpStatus?: number;
}

export interface KintoneAppListResult {
  status: KintoneConnectionStatus;
  fetchedAt: ISODateString;
  apps: AppSummary[];
  message: string;
  httpStatus?: number;
}

export type KintoneCaptureState = "live" | "preview" | "site";
export type KintoneRestCaptureStatus = "captured" | "failed" | "skipped";

export interface KintoneRestCapture {
  categoryKey: string;
  endpointKey: string;
  label: string;
  kind: CollectorKind;
  appId?: Id;
  kintoneAppId?: number;
  state: KintoneCaptureState;
  endpointPath?: string;
  status: KintoneRestCaptureStatus;
  httpStatus?: number;
  payload?: unknown;
  redactions: RedactionFinding[];
  message?: string;
  errorCode?: string;
  startedAt: ISODateString;
  finishedAt: ISODateString;
}

export interface KintoneRestCollectionInput {
  projectId: Id;
  siteId: Id;
  presetId: PresetId;
  selectedApps: AppSummary[];
  enabledCategoryKeys: string[];
  sensitiveOptions: SensitiveCaptureOption[];
}

export interface KintoneRestCollectionResult {
  startedAt: ISODateString;
  finishedAt: ISODateString;
  durationMs: number;
  status: ResultStatus;
  captures: KintoneRestCapture[];
  result: ScanResult;
}

export interface KintoneRestCommand {
  id: string;
  categoryKey: string;
  endpointKey: string;
  label: string;
  kind: CollectorKind;
  appId: Id;
  appName: string;
  kintoneAppId: number;
  state: "live" | "preview";
  method: "GET";
  endpointPath: string;
  orderIndex: number;
  totalCommands: number;
}

export interface KintoneRestCommandPlanInput {
  selectedApps: AppSummary[];
  enabledCategoryKeys: string[];
  sensitiveOptions: SensitiveCaptureOption[];
}

export interface KintoneRestCommandPlan {
  commands: KintoneRestCommand[];
  skippedCaptures: KintoneRestCapture[];
}

export interface KintoneRestFinalizeInput {
  startedAt: ISODateString;
  finishedAt: ISODateString;
  selectedApps: AppSummary[];
  captures: KintoneRestCapture[];
}

interface KintoneAppsResponse {
  apps?: unknown[];
}

interface KintoneApiApp {
  appId?: unknown;
  name?: unknown;
  code?: unknown;
  spaceId?: unknown;
}

interface KintoneApiSpace {
  name?: unknown;
}

interface KintoneAppWithSpaceId extends AppSummary {
  spaceId?: string;
}

interface RestEndpointDefinition {
  categoryKey: string;
  endpointKey: string;
  label: string;
  state: "live" | "preview";
  pathForApp(appId: number): string;
}

interface JsonEndpointResult {
  ok: boolean;
  status: KintoneConnectionStatus;
  httpStatus?: number;
  payload?: unknown;
  message: string;
}

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
  },
) => Promise<{
  status: number;
  ok: boolean;
  text(): Promise<string>;
  headers?: {
    forEach(callback: (value: string, key: string) => void): void;
  };
}>;

const appListPageLimit = 100;
const base64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function createKintoneReadOnlyClient({ domain, auth, transport = defaultKintoneTransport, now = () => new Date() }: KintoneReadOnlyClientOptions) {
  const normalizedDomain = normalizeKintoneDomain(domain);
  const domainValidation = validateKintoneDomain(normalizedDomain, "domain");
  const authHeader = createPasswordAuthHeader(auth.username, auth.password);

  async function validateConnection(): Promise<KintoneConnectionResult> {
    const checkedAt = toIso(now());
    if (!domainValidation.ok) {
      return {
        status: "unreachable",
        checkedAt,
        message: domainValidation.issues[0]?.message ?? "kintone domain is invalid.",
      };
    }

    const result = await requestAppsPage(0, 1);
    if (result.ok) {
      return {
        status: "connected",
        checkedAt,
        message: "Read-only kintone app list endpoint is reachable.",
        httpStatus: result.httpStatus,
      };
    }

    return {
      status: result.status,
      checkedAt,
      message: result.message,
      httpStatus: result.httpStatus,
    };
  }

  async function fetchApps(): Promise<KintoneAppListResult> {
    const fetchedAt = toIso(now());
    if (!domainValidation.ok) {
      return {
        status: "unreachable",
        fetchedAt,
        apps: [],
        message: domainValidation.issues[0]?.message ?? "kintone domain is invalid.",
      };
    }

    const apps: KintoneAppWithSpaceId[] = [];
    for (let offset = 0; ; offset += appListPageLimit) {
      const page = await requestAppsPage(offset, appListPageLimit);
      if (!page.ok) {
        return {
          status: page.status,
          fetchedAt,
          apps: [],
          message: page.message,
          httpStatus: page.httpStatus,
        };
      }

      apps.push(...page.apps);
      if (page.apps.length < appListPageLimit) {
        const uniqueSpaceCount = countUniqueSpaceIds(apps);
        const spaceNamesById = await fetchSpaceNamesById(apps);
        return {
          status: "connected",
          fetchedAt,
          apps: resolveAppSpaceNames(apps, spaceNamesById),
          message: appListMessage(apps.length, uniqueSpaceCount, spaceNamesById.size),
          httpStatus: page.httpStatus,
        };
      }
    }
  }

  async function collectRestMetadata(input: KintoneRestCollectionInput): Promise<KintoneRestCollectionResult> {
    const startedAtDate = now();
    const startedAt = toIso(startedAtDate);
    const plan = planRestMetadataCommands(input, startedAt);
    const captures: KintoneRestCapture[] = [];

    for (const command of plan.commands) {
      captures.push(await executeRestMetadataCommand(command));
    }

    captures.push(...plan.skippedCaptures);
    return finalizeRestMetadataCollection({
      startedAt,
      finishedAt: toIso(now()),
      selectedApps: input.selectedApps,
      captures,
    });
  }

  async function executeRestMetadataCommand(command: KintoneRestCommand): Promise<KintoneRestCapture> {
    const endpointStartedAt = toIso(now());
    const response = await requestJsonEndpoint(command.endpointPath);
    const endpointFinishedAt = toIso(now());

    if (!response.ok) {
      return {
        categoryKey: command.categoryKey,
        endpointKey: command.endpointKey,
        label: command.label,
        kind: command.kind,
        appId: command.appId,
        kintoneAppId: command.kintoneAppId,
        state: command.state,
        endpointPath: command.endpointPath,
        status: "failed",
        httpStatus: response.httpStatus,
        redactions: [],
        message: response.message,
        errorCode: errorCodeForStatus(response.status),
        startedAt: endpointStartedAt,
        finishedAt: endpointFinishedAt,
      };
    }

    const redactedPayload = redactSensitiveData(response.payload);
    return {
      categoryKey: command.categoryKey,
      endpointKey: command.endpointKey,
      label: command.label,
      kind: command.kind,
      appId: command.appId,
      kintoneAppId: command.kintoneAppId,
      state: command.state,
      endpointPath: command.endpointPath,
      status: "captured",
      httpStatus: response.httpStatus,
      payload: redactedPayload.value,
      redactions: redactedPayload.findings,
      message: "Captured from kintone REST API.",
      startedAt: endpointStartedAt,
      finishedAt: endpointFinishedAt,
    };
  }

  async function requestAppsPage(offset: number, limit: number): Promise<{ ok: true; apps: KintoneAppWithSpaceId[]; httpStatus: number } | { ok: false; status: KintoneConnectionStatus; message: string; httpStatus?: number }> {
    const url = `https://${normalizedDomain}/k/v1/apps.json?limit=${limit}&offset=${offset}`;

    let response: KintoneHttpResponse;
    try {
      response = await transport({
        method: "GET",
        url,
        headers: {
          "X-Cybozu-Authorization": authHeader,
          Accept: "application/json",
        },
      });
    } catch (error) {
      return {
        ok: false,
        status: "unreachable",
        message: redactKintoneSensitiveText(errorMessage(error)),
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: statusFromHttpStatus(response.status),
        message: messageFromHttpStatus(response.status, response.bodyText),
        httpStatus: response.status,
      };
    }

    try {
      const parsed = JSON.parse(response.bodyText) as KintoneAppsResponse;
      if (!Array.isArray(parsed.apps)) {
        return {
          ok: false,
          status: "invalid_response",
          message: "kintone app list response did not include an apps array.",
          httpStatus: response.status,
        };
      }

      return {
        ok: true,
        apps: parsed.apps.map(normalizeKintoneApiApp),
        httpStatus: response.status,
      };
    } catch {
      return {
        ok: false,
        status: "invalid_response",
        message: "kintone app list response was not valid JSON.",
        httpStatus: response.status,
      };
    }
  }

  async function fetchSpaceNamesById(apps: KintoneAppWithSpaceId[]): Promise<Map<string, string>> {
    const spaceIds = uniqueSpaceIds(apps);
    if (spaceIds.size === 0) {
      return new Map();
    }

    const spaces = new Map<string, string>();
    for (const spaceId of spaceIds) {
      const spaceName = await requestSpaceName(spaceId);
      if (spaceName) {
        spaces.set(spaceId, spaceName);
      }
    }

    return spaces;
  }

  async function requestSpaceName(spaceId: string): Promise<string | null> {
    const url = `https://${normalizedDomain}/k/v1/space.json?id=${encodeURIComponent(spaceId)}`;

    let response: KintoneHttpResponse;
    try {
      response = await transport({
        method: "GET",
        url,
        headers: {
          "X-Cybozu-Authorization": authHeader,
          Accept: "application/json",
        },
      });
    } catch {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    try {
      const parsed = JSON.parse(response.bodyText) as KintoneApiSpace;
      const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
      return name.length > 0 ? name : null;
    } catch {
      return null;
    }
  }

  async function requestJsonEndpoint(endpointPath: string): Promise<JsonEndpointResult> {
    const url = `https://${normalizedDomain}${endpointPath}`;

    let response: KintoneHttpResponse;
    try {
      response = await transport({
        method: "GET",
        url,
        headers: {
          "X-Cybozu-Authorization": authHeader,
          Accept: "application/json",
        },
      });
    } catch (error) {
      return {
        ok: false,
        status: "unreachable",
        message: redactKintoneSensitiveText(errorMessage(error)),
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: statusFromHttpStatus(response.status),
        message: messageFromHttpStatus(response.status, response.bodyText),
        httpStatus: response.status,
      };
    }

    try {
      return {
        ok: true,
        status: "connected",
        httpStatus: response.status,
        message: "Captured.",
        payload: JSON.parse(response.bodyText) as unknown,
      };
    } catch {
      return {
        ok: false,
        status: "invalid_response",
        httpStatus: response.status,
        message: "kintone REST response was not valid JSON.",
      };
    }
  }

  return {
    validateConnection,
    fetchApps,
    collectRestMetadata,
    executeRestMetadataCommand,
  };
}

export function planRestMetadataCommands(input: KintoneRestCommandPlanInput, skippedAt: ISODateString = toIso(new Date())): KintoneRestCommandPlan {
  const enabledKeys = new Set(input.enabledCategoryKeys);
  const endpointDefinitions = restEndpointDefinitions.filter((definition) => enabledKeys.has(definition.categoryKey));
  const commands = input.selectedApps.flatMap((appSummary) =>
    endpointDefinitions.map((definition) => {
      const category = categoryForKey(definition.categoryKey);
      const endpointPath =
        definition.endpointKey === "sample-records"
          ? sampleRecordsPath(appSummary.kintoneAppId, input.sensitiveOptions)
          : definition.pathForApp(appSummary.kintoneAppId);
      return {
        id: `${appSummary.id}.${definition.endpointKey}`,
        categoryKey: definition.categoryKey,
        endpointKey: definition.endpointKey,
        label: `${appSummary.name} · ${definition.label}`,
        kind: category.collectorKind,
        appId: appSummary.id,
        appName: appSummary.name,
        kintoneAppId: appSummary.kintoneAppId,
        state: definition.state,
        method: "GET" as const,
        endpointPath,
        orderIndex: 0,
        totalCommands: 0,
      };
    }),
  );

  return {
    commands: commands.map((command, index) => ({ ...command, orderIndex: index, totalCommands: commands.length })),
    skippedCaptures: skippedCapturesForEnabledUnsupportedCategories(enabledKeys, skippedAt),
  };
}

export function finalizeRestMetadataCollection(input: KintoneRestFinalizeInput): KintoneRestCollectionResult {
  const startedAtDate = new Date(input.startedAt);
  const finishedAtDate = new Date(input.finishedAt);
  const result = scanResultFromCaptures(input.captures, input.selectedApps, startedAtDate, finishedAtDate);
  return {
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    durationMs: Math.max(0, finishedAtDate.getTime() - startedAtDate.getTime()),
    status: result.status,
    captures: input.captures,
    result,
  };
}

export function createPasswordAuthHeader(username: string, password: string): string {
  return base64Encode(utf8Bytes(`${username}:${password}`));
}

export function redactKintoneSensitiveText(value: string): string {
  return value
    .replace(/(X-Cybozu-Authorization\s*[:=]\s*)[^\s,;)}\]]+/gi, "$1[REDACTED]")
    .replace(/(^|[\s,{])(Authorization\s*[:=]\s*)(Bearer\s+)?[^\s,;)}\]]+/gi, "$1$2[REDACTED]")
    .replace(/(Cookie\s*[:=]\s*)[^\r\n]+/gi, "$1[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]");
}

export async function defaultKintoneTransport(request: KintoneHttpRequest): Promise<KintoneHttpResponse> {
  const fetchImpl = (globalThis as { fetch?: FetchLike }).fetch;
  if (!fetchImpl) {
    throw new Error("Fetch is unavailable in this runtime.");
  }

  const response = await fetchImpl(request.url, {
    method: request.method,
    headers: request.headers,
  });
  const headers: Record<string, string> = {};
  response.headers?.forEach((value, key) => {
    headers[key] = value;
  });
  return {
    status: response.status,
    ok: response.ok,
    headers,
    bodyText: await response.text(),
  };
}

function normalizeKintoneDomain(domain: string) {
  return domain.trim().replace(/^https?:\/\//i, "").replace(/\/+$/g, "");
}

function normalizeKintoneApiApp(value: unknown): KintoneAppWithSpaceId {
  const app = (value && typeof value === "object" ? value : {}) as KintoneApiApp;
  const kintoneAppId = positiveIntegerFromUnknown(app.appId);
  const name = typeof app.name === "string" && app.name.trim().length > 0 ? app.name.trim() : `App ${kintoneAppId}`;
  const spaceId = positiveIntegerStringFromUnknown(app.spaceId);
  return {
    id: String(kintoneAppId),
    kintoneAppId,
    name,
    ...(spaceId ? { spaceId, spaceName: `Space ID ${spaceId}` } : {}),
    isGuestSpace: false,
    hasPlugins: false,
    hasCustomization: false,
    captureStatus: "not_captured",
  };
}

function resolveAppSpaceNames(apps: KintoneAppWithSpaceId[], spaceNamesById: Map<string, string>): AppSummary[] {
  return apps.map(({ spaceId, ...app }) => ({
    ...app,
    ...(spaceId && spaceNamesById.has(spaceId) ? { spaceName: spaceNamesById.get(spaceId) } : {}),
  }));
}

function countUniqueSpaceIds(apps: KintoneAppWithSpaceId[]) {
  return uniqueSpaceIds(apps).size;
}

function uniqueSpaceIds(apps: KintoneAppWithSpaceId[]) {
  return new Set(apps.map((app) => app.spaceId).filter((spaceId): spaceId is string => typeof spaceId === "string" && spaceId.length > 0));
}

function positiveIntegerFromUnknown(value: unknown, fallback = 1) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function positiveIntegerStringFromUnknown(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return String(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return /^[1-9]\d*$/.test(trimmed) ? trimmed : undefined;
  }
  return undefined;
}

function appListMessage(appCount: number, uniqueSpaceCount: number, resolvedSpaceCount: number) {
  const appCopy = `Fetched ${appCount} app${appCount === 1 ? "" : "s"} from kintone.`;
  if (uniqueSpaceCount === 0) {
    return appCopy;
  }
  if (resolvedSpaceCount === uniqueSpaceCount) {
    return `${appCopy} Resolved ${resolvedSpaceCount} space name${resolvedSpaceCount === 1 ? "" : "s"}.`;
  }
  return `${appCopy} Resolved ${resolvedSpaceCount} of ${uniqueSpaceCount} space names; unresolved private or inaccessible spaces are shown by Space ID.`;
}

const restEndpointDefinitions: RestEndpointDefinition[] = [
  requiredEndpoint("app_settings", "app-settings", "App settings", "live", (app) => `/k/v1/app/settings.json?app=${app}`),
  requiredEndpoint("app_settings", "app-settings-preview", "App settings preview", "preview", (app) => `/k/v1/preview/app/settings.json?app=${app}`),
  requiredEndpoint("form_fields", "form-fields", "Form fields", "live", (app) => `/k/v1/app/form/fields.json?app=${app}`),
  requiredEndpoint("form_fields", "form-fields-preview", "Form fields preview", "preview", (app) => `/k/v1/preview/app/form/fields.json?app=${app}`),
  requiredEndpoint("form_layout", "form-layout", "Form layout", "live", (app) => `/k/v1/app/form/layout.json?app=${app}`),
  requiredEndpoint("form_layout", "form-layout-preview", "Form layout preview", "preview", (app) => `/k/v1/preview/app/form/layout.json?app=${app}`),
  requiredEndpoint("views_process_permissions", "views", "Views", "live", (app) => `/k/v1/app/views.json?app=${app}`),
  requiredEndpoint("views_process_permissions", "views-preview", "Views preview", "preview", (app) => `/k/v1/preview/app/views.json?app=${app}`),
  requiredEndpoint("views_process_permissions", "process-management", "Process management", "live", (app) => `/k/v1/app/status.json?app=${app}`),
  requiredEndpoint("views_process_permissions", "process-management-preview", "Process management preview", "preview", (app) => `/k/v1/preview/app/status.json?app=${app}`),
  requiredEndpoint("views_process_permissions", "app-permissions", "App permissions", "live", (app) => `/k/v1/app/acl.json?app=${app}`),
  requiredEndpoint("views_process_permissions", "app-permissions-preview", "App permissions preview", "preview", (app) => `/k/v1/preview/app/acl.json?app=${app}`),
  requiredEndpoint("views_process_permissions", "record-permissions", "Record permissions", "live", (app) => `/k/v1/record/acl.json?app=${app}`),
  requiredEndpoint("views_process_permissions", "record-permissions-preview", "Record permissions preview", "preview", (app) => `/k/v1/preview/record/acl.json?app=${app}`),
  requiredEndpoint("views_process_permissions", "field-permissions", "Field permissions", "live", (app) => `/k/v1/field/acl.json?app=${app}`),
  requiredEndpoint("views_process_permissions", "field-permissions-preview", "Field permissions preview", "preview", (app) => `/k/v1/preview/field/acl.json?app=${app}`),
  requiredEndpoint("views_process_permissions", "actions", "Actions", "live", (app) => `/k/v1/app/actions.json?app=${app}`),
  requiredEndpoint("views_process_permissions", "actions-preview", "Actions preview", "preview", (app) => `/k/v1/preview/app/actions.json?app=${app}`),
  requiredEndpoint("views_process_permissions", "notifications-general", "General notifications", "live", (app) => `/k/v1/app/notifications/general.json?app=${app}`),
  requiredEndpoint("views_process_permissions", "notifications-general-preview", "General notifications preview", "preview", (app) => `/k/v1/preview/app/notifications/general.json?app=${app}`),
  requiredEndpoint("views_process_permissions", "notifications-per-record", "Per-record notifications", "live", (app) => `/k/v1/app/notifications/perRecord.json?app=${app}`),
  requiredEndpoint("views_process_permissions", "notifications-per-record-preview", "Per-record notifications preview", "preview", (app) => `/k/v1/preview/app/notifications/perRecord.json?app=${app}`),
  requiredEndpoint("views_process_permissions", "notifications-reminder", "Reminder notifications", "live", (app) => `/k/v1/app/notifications/reminder.json?app=${app}`),
  requiredEndpoint("views_process_permissions", "notifications-reminder-preview", "Reminder notifications preview", "preview", (app) => `/k/v1/preview/app/notifications/reminder.json?app=${app}`),
  requiredEndpoint("plugin_inventory", "plugins", "Plugin inventory", "live", (app) => `/k/v1/app/plugins.json?app=${app}`),
  requiredEndpoint("plugin_inventory", "plugins-preview", "Plugin inventory preview", "preview", (app) => `/k/v1/preview/app/plugins.json?app=${app}`),
  requiredEndpoint("customization_metadata", "customize", "Customization metadata", "live", (app) => `/k/v1/app/customize.json?app=${app}`),
  requiredEndpoint("customization_metadata", "customize-preview", "Customization metadata preview", "preview", (app) => `/k/v1/preview/app/customize.json?app=${app}`),
  requiredEndpoint("customization_metadata", "admin-notes", "Admin notes", "live", (app) => `/k/v1/app/adminNotes.json?app=${app}`),
  requiredEndpoint("customization_metadata", "admin-notes-preview", "Admin notes preview", "preview", (app) => `/k/v1/preview/app/adminNotes.json?app=${app}`),
  optionalEndpoint("sample_records", "sample-records", "Sample records", "live", (app) => `/k/v1/records.json?app=${app}&totalCount=true&query=${encodeURIComponent("limit 25")}`),
];

const unsupportedRestCategoryMessages: Record<string, string> = {
  users_groups: "User, group, and department collectors need dedicated User API pagination and will be added after the REST app snapshot path.",
  spaces: "Space member capture needs a site-level collector; app space names are already resolved from app-list metadata.",
  app_customization_files: "Customization file body download is not enabled in this phase; REST customization metadata is captured.",
  plugin_config: "Plugin saved config requires browser runtime capture with kintone.plugin.app.getConfig().",
  dependencies_preview_diff: "Dependency detection and preview-vs-live diff will be generated from captured snapshot data in a later phase.",
  plugin_assets: "Plugin asset capture requires opt-in browser network capture and is not part of the REST snapshot path.",
  record_comments: "Record comments and attachment metadata remain opt-in and need a dedicated records collector.",
  full_records: "Full record capture remains opt-in and is intentionally not part of this first real snapshot path.",
};

function requiredEndpoint(categoryKey: string, endpointKey: string, label: string, state: "live" | "preview", pathForApp: (appId: number) => string): RestEndpointDefinition {
  return { categoryKey, endpointKey, label, state, pathForApp };
}

function optionalEndpoint(categoryKey: string, endpointKey: string, label: string, state: "live" | "preview", pathForApp: (appId: number) => string): RestEndpointDefinition {
  return { categoryKey, endpointKey, label, state, pathForApp };
}

function categoryForKey(key: string) {
  return CAPTURE_CATEGORIES.find((category) => category.key === key) ?? CAPTURE_CATEGORIES[0];
}

function skippedCapturesForEnabledUnsupportedCategories(enabledKeys: Set<string>, timestamp: string): KintoneRestCapture[] {
  return Object.entries(unsupportedRestCategoryMessages)
    .filter(([categoryKey]) => enabledKeys.has(categoryKey))
    .map(([categoryKey, message]) => {
      const category = categoryForKey(categoryKey);
      return {
        categoryKey,
        endpointKey: categoryKey,
        label: category.label,
        kind: category.collectorKind,
        state: "site",
        status: "skipped",
        redactions: [],
        message,
        startedAt: timestamp,
        finishedAt: timestamp,
      };
    });
}

function scanResultFromCaptures(captures: KintoneRestCapture[], selectedApps: AppSummary[], startedAt: Date, finishedAt: Date): ScanResult {
  const requiredCaptures = captures.filter((capture) => capture.kind === "required");
  const requiredFailed = requiredCaptures.filter((capture) => capture.status === "failed");
  const optionalSkippedOrFailed = captures.filter((capture) => capture.kind === "optional" && capture.status !== "captured");
  const redaction = redactionSummaryFromCaptures(captures);
  const status: ResultStatus = requiredFailed.length > 0 ? "failed" : optionalSkippedOrFailed.length > 0 ? "completed_with_warnings" : "completed";
  const failedAppIds = new Set(requiredFailed.map((capture) => capture.appId).filter((appId): appId is string => Boolean(appId)));
  const collectors = captures.map(collectorFromCapture);
  return {
    status,
    durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
    requiredOk: requiredCaptures.filter((capture) => capture.status === "captured").length,
    requiredTotal: requiredCaptures.length,
    optionalSkipped: optionalSkippedOrFailed.length,
    warningCount: status === "failed" ? requiredFailed.length + optionalSkippedOrFailed.length : optionalSkippedOrFailed.length,
    appsCaptured: selectedApps.filter((app) => !failedAppIds.has(app.id)).length,
    pluginsCaptured: countCapturedPlugins(captures),
    redaction,
    collectors,
    ...(status === "failed" ? { error: requiredCollectorFailureError(requiredFailed.length) } : {}),
  };
}

function collectorFromCapture(capture: KintoneRestCapture): CollectorResult {
  return {
    key: `${capture.appId ?? "site"}.${capture.endpointKey}`,
    label: capture.label,
    kind: capture.kind,
    status: capture.status === "captured" ? "done" : capture.status,
    appId: capture.appId,
    message: capture.message,
  };
}

function redactionSummaryFromCaptures(captures: KintoneRestCapture[]): RedactionSummary {
  const totalRedactions = captures.reduce((count, capture) => count + capture.redactions.length, 0);
  return {
    enabled: true,
    totalRedactions,
    byType: { fieldValues: 0, comments: 0, attachments: 0, other: totalRedactions },
    logPath: "logs/redaction-log.jsonl",
  };
}

function countCapturedPlugins(captures: KintoneRestCapture[]) {
  return captures
    .filter((capture) => capture.status === "captured" && capture.endpointKey === "plugins" && capture.payload && typeof capture.payload === "object")
    .reduce((count, capture) => {
      const plugins = (capture.payload as { plugins?: unknown }).plugins;
      return count + (Array.isArray(plugins) ? plugins.length : 0);
    }, 0);
}

function requiredCollectorFailureError(failedCount: number): ErrorStateModel {
  return {
    code: "REQUIRED_COLLECTOR_FAILED",
    title: "Required REST collector failed",
    body: `${failedCount} required kintone REST request${failedCount === 1 ? "" : "s"} failed. Nothing was written back to kintone; partial snapshot data is kept for inspection.`,
    tone: "danger",
    actions: [
      { label: "Retry scan", actionKey: "retry", primary: true },
      { label: "Review partial scan summary", actionKey: "partial_summary" },
    ],
    partialDataKept: true,
  };
}

function errorCodeForStatus(status: KintoneConnectionStatus) {
  if (status === "auth_failed") return "AUTH_FAILED";
  if (status === "permission_denied") return "PERMISSION_DENIED";
  if (status === "invalid_response") return "API_RESPONSE_INVALID";
  return "SITE_UNREACHABLE";
}

function sampleRecordsPath(appId: number, sensitiveOptions: SensitiveCaptureOption[]) {
  const configuredLimit = sensitiveOptions.find((option) => option.categoryKey === "sample_records")?.limit;
  const limit = clampInteger(configuredLimit ?? 25, 1, 100);
  return `/k/v1/records.json?app=${appId}&totalCount=true&query=${encodeURIComponent(`limit ${limit}`)}`;
}

function clampInteger(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Number.isInteger(value) ? value : minimum));
}

function statusFromHttpStatus(status: number): KintoneConnectionStatus {
  if (status === 401) {
    return "auth_failed";
  }
  if (status === 403) {
    return "permission_denied";
  }
  if (status >= 200 && status < 300) {
    return "connected";
  }
  return "unreachable";
}

function messageFromHttpStatus(status: number, bodyText: string) {
  const bodyMessage = messageFromKintoneBody(bodyText);
  if (status === 401) {
    return bodyMessage || "kintone rejected the saved username or password.";
  }
  if (status === 403) {
    return bodyMessage || "The account does not have permission to list visible kintone apps.";
  }
  return bodyMessage || `kintone app list request failed with HTTP ${status}.`;
}

function messageFromKintoneBody(bodyText: string) {
  if (!bodyText.trim()) {
    return "";
  }

  try {
    const parsed = JSON.parse(bodyText) as { message?: unknown };
    return typeof parsed.message === "string" ? redactKintoneSensitiveText(parsed.message) : "";
  } catch {
    return redactKintoneSensitiveText(bodyText.slice(0, 240));
  }
}

function utf8Bytes(value: string): number[] {
  const bytes: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    let codePoint = value.charCodeAt(index);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && index + 1 < value.length) {
      const low = value.charCodeAt(index + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        codePoint = ((codePoint - 0xd800) << 10) + (low - 0xdc00) + 0x10000;
        index += 1;
      }
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    } else {
      bytes.push(0xf0 | (codePoint >> 18), 0x80 | ((codePoint >> 12) & 0x3f), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    }
  }
  return bytes;
}

function base64Encode(bytes: number[]) {
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    output += base64Alphabet[first >> 2];
    output += base64Alphabet[((first & 0x03) << 4) | ((second ?? 0) >> 4)];
    output += second === undefined ? "=" : base64Alphabet[((second & 0x0f) << 2) | ((third ?? 0) >> 6)];
    output += third === undefined ? "=" : base64Alphabet[third & 0x3f];
  }
  return output;
}

function toIso(date: Date): ISODateString {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
