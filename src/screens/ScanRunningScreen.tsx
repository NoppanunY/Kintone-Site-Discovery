import { PrimaryActionButton, StatusPill, WarningBanner } from "../components";
import { PageHeader } from "./shared";

const collectors = [
  { label: "App structure", status: "Done", tone: "ok" as const },
  { label: "Plugin saved config", status: "Running", tone: "run" as const },
  { label: "Sample records", status: "Skipped", tone: "warn" as const },
  { label: "Developer files", status: "Queued", tone: "idle" as const },
];

export function ScanRunningScreen() {
  return (
    <div className="page">
      <PageHeader
        breadcrumb="Client A Production · Scan"
        title="Scanning…"
        subtitle="App 3 of 4 · Support Tickets"
        actions={
          <>
            <StatusPill status="run" label="Running" dot />
            <PrimaryActionButton label="Cancel scan" tone="danger" />
          </>
        }
      />
      <div className="card card-pad">
        <div className="between">
          <span className="h3">Overall progress</span>
          <span className="mono">62%</span>
        </div>
        <div className="progress" aria-label="Overall progress">
          <i className="progress__bar" style={{ width: "62%" }} />
        </div>
      </div>
      <div className="list">
        {collectors.map((collector) => (
          <div className="li" key={collector.label}>
            <div className="grow">
              <div className="h3">{collector.label}</div>
              <div className="small muted2">Mock collector state</div>
            </div>
            <StatusPill status={collector.tone} label={collector.status} dot={collector.tone === "run"} />
          </div>
        ))}
      </div>
      <WarningBanner tone="info">Optional failures are skipped. Only required collector failures stop the run.</WarningBanner>
    </div>
  );
}
