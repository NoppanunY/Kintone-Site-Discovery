export interface DeterministicStringifyOptions {
  assertNoSecrets?: boolean;
  space?: number;
}

export interface SecretFinding {
  path: string;
  reason: string;
}

const secretKeyPattern = /(password|token|api[_-]?token|access[_-]?token|refresh[_-]?token|session|cookie|authorization|client[_-]?secret|private[_-]?key|bearer|proxy[_-]?secret)/i;
const secretValuePattern = /^\s*(bearer|basic)\s+[a-z0-9._~+/-]+=*\s*$/i;
const privateKeyValuePattern = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const jwtValuePattern = /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/;
const tokenPrefixValuePattern = /^(?:sk|pk|ghp|gho|github_pat|xox[baprs]|ya29|AKIA)[A-Za-z0-9_./+=-]{8,}$/;
const highEntropyValuePattern = /^[A-Za-z0-9_./+=-]{40,}$/;
const localIdValuePattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const allowedSecretishKeys = new Set(["authType", "credentialStatus", "keychainRef"]);

export function findSecretReferences(value: unknown): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const seen = new WeakSet<object>();

  function walk(current: unknown, path: string) {
    if (current === null || current === undefined) {
      return;
    }

    if (typeof current === "string") {
      if (secretValuePattern.test(current)) {
        findings.push({ path, reason: "String value looks like an authorization header." });
      } else if (privateKeyValuePattern.test(current)) {
        findings.push({ path, reason: "String value looks like a private key." });
      } else if (jwtValuePattern.test(current)) {
        findings.push({ path, reason: "String value looks like a JWT or session token." });
      } else if (tokenPrefixValuePattern.test(current)) {
        findings.push({ path, reason: "String value looks like an API token." });
      } else if (looksHighEntropySecret(current, path)) {
        findings.push({ path, reason: "String value looks like a generated secret." });
      }
      return;
    }

    if (typeof current !== "object") {
      return;
    }

    if (seen.has(current)) {
      return;
    }
    seen.add(current);

    if (Array.isArray(current)) {
      current.forEach((item, index) => walk(item, `${path}[${index}]`));
      return;
    }

    Object.entries(current as Record<string, unknown>).forEach(([key, item]) => {
      const nextPath = path ? `${path}.${key}` : key;
      if (!allowedSecretishKeys.has(key) && secretKeyPattern.test(key)) {
        findings.push({ path: nextPath, reason: `Key "${key}" must not be serialized.` });
      }
      walk(item, nextPath);
    });
  }

  walk(value, "");
  return findings;
}

function looksHighEntropySecret(value: string, path: string): boolean {
  if (!highEntropyValuePattern.test(value) || value.includes("://")) {
    return false;
  }
  if (isRoutePath(path) && isSafeAppRoute(value)) {
    return false;
  }
  if (isLocalIdPath(path) && localIdValuePattern.test(value)) {
    return false;
  }

  const classes = [/[a-z]/.test(value), /[A-Z]/.test(value), /\d/.test(value), /[_.+=/-]/.test(value)].filter(Boolean).length;
  return classes >= 3;
}

function isLocalIdPath(path: string): boolean {
  return /(?:^|\.)(?:id|[A-Za-z]+Id)$/.test(path) || /(?:^|\.)(?:id|[A-Za-z]+Id|[A-Za-z]+Ids)\[\d+\]$/.test(path);
}

function isRoutePath(path: string): boolean {
  return /(?:^|\.)routePath$/.test(path);
}

function isSafeAppRoute(value: string): boolean {
  return /^\/[A-Za-z0-9/_?=&.-]*$/.test(value);
}

export function assertNoSecretReferences(value: unknown): void {
  const findings = findSecretReferences(value);
  if (findings.length > 0) {
    const details = findings.map((finding) => `${finding.path}: ${finding.reason}`).join("; ");
    throw new Error(`Refusing to serialize secret-bearing data: ${details}`);
  }
}

function sortForJson(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    throw new TypeError("Cannot serialize circular data.");
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sortForJson(item, seen));
  }

  const record = value as Record<string, unknown>;
  return Object.keys(record)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      const item = record[key];
      if (item !== undefined) {
        result[key] = sortForJson(item, seen);
      }
      return result;
    }, {});
}

export function stringifyDeterministic(value: unknown, options: DeterministicStringifyOptions = {}): string {
  if (options.assertNoSecrets ?? true) {
    assertNoSecretReferences(value);
  }

  return `${JSON.stringify(sortForJson(value), null, options.space ?? 2)}\n`;
}
