import { PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import { PageHeader } from "./shared";

const collectorRows = [
  { status: "Done", tone: "ok" as const, label: "REST · form fields, layout, views, process, permissions" },
  { status: "Done", tone: "ok" as const, label: "Plugin inventory" },
  { status: "Running", tone: "run" as const, label: "Browser · plugin saved config" },
  { status: "Skipped", tone: "warn" as const, label: "1 plugin: runtime unavailable — optional, continuing" },
  { status: "Queued", tone: "idle" as const, label: "Dependency detection · preview-vs-live diff", muted: true },
];

export function ScanRunningScreen({
  source,
  onCancel,
  onChangeSettings,
}: {
  source: "new" | "rerun";
  onCancel: () => void;
  onChangeSettings: () => void;
}) {
  const isRerun = source === "rerun";
  return (
    <div className="page">
      <PageHeader
        breadcrumb="Client A Production · Scan"
        title={isRerun ? "Re-running scan..." : "Scanning..."}
        titleMeta={<StatusPill status="run" label="Running" dot />}
        subtitle={isRerun ? "Standard Scan · 4 apps · sensitive options off" : "Building local snapshot · App 3 of 4 · Support Tickets"}
        actions={
          <>
            {isRerun ? <SecondaryActionButton label="Change settings" size="sm" variant="ghost" onClick={onChangeSettings} /> : null}
            <PrimaryActionButton label="✕ Cancel scan" tone="danger" onClick={onCancel} />
          </>
        }
      />
      <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="between">
          <span className="h3">Overall progress</span>
          <span className="small muted">62%</span>
        </div>
        <div className="progress">
          <i style={{ width: "62%" }} />
        </div>
        <div className="small muted2">Current collector: plugin saved config</div>
      </div>
      <div className="list">
        {collectorRows.map((row) => (
          <div className="li" key={row.label}>
            <StatusPill status={row.tone} label={row.status} dot />
            <div className={`grow body ${row.muted ? "muted" : ""}`}>{row.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
