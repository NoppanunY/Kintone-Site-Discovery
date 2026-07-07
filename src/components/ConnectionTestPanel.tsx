import type { ConnectionTestResult } from "../types";
import { SecondaryActionButton } from "./Buttons";
import { StatusPill } from "./StatusPill";

interface ConnectionTestPanelProps {
  result: ConnectionTestResult;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ConnectionTestPanel({ result, onRetry, onDismiss }: ConnectionTestPanelProps) {
  if (result.status !== "failed") {
    return null;
  }

  return (
    <div className="connection-test connection-test--failed" role="alert" aria-live="polite">
      <div className="connection-test__head">
        <div>
          <div className="h3">Connection needs attention</div>
          <div className="small muted2">
            {result.domain} · {result.authProfile}
          </div>
        </div>
        <StatusPill status="err" label="Failed" dot />
      </div>
      <div className="connection-test__grid">
        <span>Domain</span>
        <b>{result.domain}</b>
        <span>Auth profile</span>
        <b>{result.authProfile}</b>
      </div>
      <div className="connection-test__error">
        <b>{result.errorSummary}</b>
        <span>{result.likelyCause}</span>
        <span>{result.nextAction}</span>
      </div>
      <div className="connection-test__actions">
        {onRetry ? <SecondaryActionButton label="Retry" size="sm" onClick={onRetry} /> : null}
        {onDismiss ? <SecondaryActionButton label="Dismiss" size="sm" variant="ghost" onClick={onDismiss} /> : null}
      </div>
    </div>
  );
}
