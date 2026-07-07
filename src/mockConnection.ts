import type { ConnectionTestResult, ConnectionTestTarget } from "./types";

function checkedAtNow() {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

export function createTestingConnectionResult(target: ConnectionTestTarget): ConnectionTestResult {
  return {
    ...target,
    status: "testing",
    checks: ["Validating mock target", "Checking saved credential reference", "Checking read-only permission shape"],
  };
}

export function createPassedConnectionResult(target: ConnectionTestTarget): ConnectionTestResult {
  return {
    ...target,
    status: "passed",
    checkedAt: checkedAtNow(),
    checks: ["Domain format accepted", "Credential reference available", "Read-only permission check passed", "No kintone request was sent"],
  };
}

export function createFailedConnectionResult(target: ConnectionTestTarget): ConnectionTestResult {
  return {
    ...target,
    status: "failed",
    checkedAt: checkedAtNow(),
    checks: ["Domain format accepted", "Credential reference found", "Read-only permission check failed", "No kintone request was sent"],
    errorSummary: "Saved credential needs attention",
    likelyCause: `The mock credential reference for ${target.authProfile} is stale or no longer matches this project site.`,
    nextAction: "Update the auth profile, confirm the domain, then retry the read-only connection test.",
  };
}
