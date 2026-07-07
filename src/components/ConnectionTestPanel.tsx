import type { ConnectionTestResult } from "../types";
import { SecondaryActionButton } from "./Buttons";
import { StatusPill } from "./StatusPill";

interface ConnectionTestPanelProps {
  result: ConnectionTestResult;
  onRetry?: () => void;
  onSimulateFailure?: () => void;
  onDismiss?: () => void;
}

const statusTone = {
  testing: "run",
  passed: "ok",
  failed: "err",
} as const;

const statusLabel = {
  testing: "Testing",
  passed: "Connection OK",
  failed: "Needs attention",
};

export function ConnectionTestPanel({ result, onRetry, onSimulateFailure, onDismiss }: ConnectionTestPanelProps) {
  const isFailed = result.status === "failed";
  const isTesting = result.status === "testing";
  const title =
    result.status === "testing"
      ? "Testing read-only connection"
      : isFailed
        ? "Read-only connection test failed"
        : "Read-only connection test passed";

  return (
    <div className={`connection-test connection-test--${result.status}`} role="status" aria-live="polite">
      <div className="connection-test__head">
        <div>
          <div className="h3">{title}</div>
          <div className="small muted2">
            {result.siteName} · {result.domain} · {result.authProfile}
          </div>
        </div>
        <StatusPill status={statusTone[result.status]} label={statusLabel[result.status]} dot />
      </div>
      <div className="connection-test__grid">
        <span>Site</span>
        <b>{result.siteName}</b>
        <span>Domain</span>
        <b>{result.domain}</b>
        <span>Auth profile</span>
        <b>{result.authProfile}</b>
        <span>Checked</span>
        <b>{result.checkedAt ?? "In progress..."}</b>
      </div>
      <div className="connection-test__checks">
        {result.checks.map((check) => (
          <span key={check}>{check}</span>
        ))}
      </div>
      {isFailed ? (
        <div className="connection-test__error">
          <b>{result.errorSummary}</b>
          <span>{result.likelyCause}</span>
          <span>{result.nextAction}</span>
        </div>
      ) : null}
      {isTesting ? null : (
        <div className="connection-test__actions">
          {onRetry ? <SecondaryActionButton label={isFailed ? "Retry" : "Test again"} size="sm" onClick={onRetry} /> : null}
          {onSimulateFailure ? <SecondaryActionButton label="Simulate failure" size="sm" variant="ghost" onClick={onSimulateFailure} /> : null}
          {onDismiss ? <SecondaryActionButton label="Dismiss" size="sm" variant="ghost" onClick={onDismiss} /> : null}
        </div>
      )}
    </div>
  );
}
