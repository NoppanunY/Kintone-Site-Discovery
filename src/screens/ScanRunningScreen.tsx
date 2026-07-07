import { PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import type { SiteWorkspaceModel } from "../types";
import { PageHeader } from "./shared";

const collectorRows = [
  { status: "Done", tone: "ok" as const, label: "REST · form fields, layout, views, process, permissions" },
  { status: "Done", tone: "ok" as const, label: "Plugin inventory" },
  { status: "Running", tone: "run" as const, label: "Browser · plugin saved config" },
  { status: "Skipped", tone: "warn" as const, label: "1 plugin: runtime unavailable — optional, continuing" },
  { status: "Queued", tone: "idle" as const, label: "Dependency detection · preview-vs-live diff", muted: true },
];

function scanLogLines(site: SiteWorkspaceModel, isRerun: boolean) {
  const command = isRerun ? "rerun --last-config" : "scan --preset standard";

  return [
    { prefix: "C:\\KintoneSiteDiscovery>", text: `${command} --site ${site.id} --read-only` },
    { prefix: "[10:35:12.084]", text: `loaded site workspace: ${site.name} (${site.domain})` },
    { prefix: "[10:35:12.171]", text: `using auth profile reference: ${site.profile}` },
    { prefix: "[10:35:12.203]", text: "planned collectors: required 17, recommended 5, additional 0" },
    { prefix: "[10:35:13.447]", text: "REST metadata completed: forms, fields, views, permissions, notifications", tone: "ok" as const },
    { prefix: "[10:35:14.208]", text: "plugin inventory completed: 5 plugins discovered", tone: "ok" as const },
    { prefix: "[10:35:15.891]", text: "browser runtime opened for plugin saved config capture" },
    { prefix: "[10:35:18.664]", text: "optional plugin asset capture is off; no JS/CSS asset body requested", tone: "warn" as const },
    { prefix: "[10:35:22.019]", text: "waiting: kintone.plugin.app.getConfig() context for Support Tickets plugin", tone: "run" as const },
    { prefix: "[10:35:28.101]", text: "current stall point: browser plugin saved config · retry 2/5", tone: "run" as const },
  ];
}

export function ScanRunningScreen({
  source,
  site,
  onCancel,
  onChangeSettings,
}: {
  source: "new" | "rerun";
  site: SiteWorkspaceModel;
  onCancel: () => void;
  onChangeSettings: () => void;
}) {
  const isRerun = source === "rerun";
  const logs = scanLogLines(site, isRerun);
  return (
    <div className="page">
      <PageHeader
        breadcrumb={`${site.name} · Scan`}
        title={isRerun ? "Re-running scan..." : "Scanning..."}
        titleMeta={<StatusPill status="run" label="Running" dot />}
        subtitle={isRerun ? `Standard Scan · ${site.selectedApps} apps · sensitive options off` : `Building local snapshot · App 3 of ${site.selectedApps} · Support Tickets`}
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
      <div className="scan-log" aria-label="Scan command log">
        <div className="scan-log__title">
          <span>Run log</span>
          <StatusPill status="run" label="Preview run" dot />
        </div>
        <div className="scan-log__body" role="log" aria-live="polite">
          {logs.map((line) => (
            <div className={`scan-log__line ${line.tone ? `scan-log__line--${line.tone}` : ""}`} key={`${line.prefix}-${line.text}`}>
              <span className="scan-log__prefix">{line.prefix}</span>
              <span>{line.text}</span>
            </div>
          ))}
          <div className="scan-log__cursor" aria-hidden="true">
            _
          </div>
        </div>
      </div>
    </div>
  );
}
