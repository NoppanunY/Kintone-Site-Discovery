import type { AppSummary, ISODateString } from "./types.js";
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

interface KintoneAppsResponse {
  apps?: unknown[];
}

interface KintoneApiApp {
  appId?: unknown;
  name?: unknown;
  code?: unknown;
  spaceId?: unknown;
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

    const apps: AppSummary[] = [];
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
        return {
          status: "connected",
          fetchedAt,
          apps,
          message: `Fetched ${apps.length} app${apps.length === 1 ? "" : "s"} from kintone.`,
          httpStatus: page.httpStatus,
        };
      }
    }
  }

  async function requestAppsPage(offset: number, limit: number): Promise<{ ok: true; apps: AppSummary[]; httpStatus: number } | { ok: false; status: KintoneConnectionStatus; message: string; httpStatus?: number }> {
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

  return {
    validateConnection,
    fetchApps,
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

function normalizeKintoneApiApp(value: unknown): AppSummary {
  const app = (value && typeof value === "object" ? value : {}) as KintoneApiApp;
  const kintoneAppId = positiveIntegerFromUnknown(app.appId);
  const name = typeof app.name === "string" && app.name.trim().length > 0 ? app.name.trim() : `App ${kintoneAppId}`;
  const spaceId = positiveIntegerFromUnknown(app.spaceId, 0);
  return {
    id: String(kintoneAppId),
    kintoneAppId,
    name,
    ...(spaceId > 0 ? { spaceName: `Space ${spaceId}` } : {}),
    isGuestSpace: false,
    hasPlugins: false,
    hasCustomization: false,
    captureStatus: "not_captured",
  };
}

function positiveIntegerFromUnknown(value: unknown, fallback = 1) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
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
