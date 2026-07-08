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
