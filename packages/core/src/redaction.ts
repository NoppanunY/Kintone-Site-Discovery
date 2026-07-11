import type { RedactionFinding } from "./types.js";

export interface RedactionResult<T = unknown> {
  value: T;
  findings: RedactionFinding[];
}

const sensitiveKeyPattern = /(password|passwd|pwd|secret|client[_-]?secret|token|api[_-]?token|access[_-]?token|refresh[_-]?token|authorization|bearer|cookie|session|x-cybozu-authorization|x-cybozu-api-token|proxy|private[_-]?key)/i;
const authorizationValuePattern = /^\s*(bearer|basic)\s+[a-z0-9._~+/-]+=*\s*$/i;
const jwtValuePattern = /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/;
const privateKeyValuePattern = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const tokenPrefixValuePattern = /^(?:sk|pk|ghp|gho|github_pat|xox[baprs]|ya29|AKIA)[A-Za-z0-9_./+=-]{8,}$/;
const redacted = "[REDACTED]" as const;

export function redactSensitiveData<T = unknown>(value: T): RedactionResult<T> {
  const findings: RedactionFinding[] = [];
  const seen = new WeakMap<object, unknown>();

  function redact(current: unknown, path: string): unknown {
    if (current === null || current === undefined) {
      return current;
    }

    if (typeof current === "string") {
      const reason = secretStringReason(current);
      if (reason) {
        findings.push({ path, reason, replacement: redacted });
        return redacted;
      }
      return current;
    }

    if (typeof current !== "object") {
      return current;
    }

    const cached = seen.get(current);
    if (cached) {
      return cached;
    }

    if (Array.isArray(current)) {
      const next: unknown[] = [];
      seen.set(current, next);
      current.forEach((item, index) => {
        next[index] = redact(item, `${path}[${index}]`);
      });
      return next;
    }

    const source = current as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    seen.set(current, next);
    Object.keys(source).forEach((key) => {
      const nextPath = path ? `${path}.${key}` : key;
      if (sensitiveKeyPattern.test(key)) {
        next[key] = redacted;
        findings.push({ path: nextPath, reason: `sensitive-key:${key}`, replacement: redacted });
        return;
      }

      next[key] = redact(source[key], nextPath);
    });
    return next;
  }

  return { value: redact(value, "") as T, findings };
}

function secretStringReason(value: string) {
  if (authorizationValuePattern.test(value)) {
    return "secret-value:authorization-header";
  }
  if (privateKeyValuePattern.test(value)) {
    return "secret-value:private-key";
  }
  if (jwtValuePattern.test(value)) {
    return "secret-value:jwt";
  }
  if (tokenPrefixValuePattern.test(value)) {
    return "secret-value:token-prefix";
  }
  return "";
}
