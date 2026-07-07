import { PrimaryActionButton, SecondaryActionButton, StatusPill, WarningBanner } from "../components";
import type { MockActionHandler, SiteWorkspaceModel } from "../types";
import { KpiGrid, PageHeader } from "./shared";

type ResultMode = "completed" | "warnings" | "failed";

interface ScanResultScreenProps {
  mode: ResultMode;
  site: SiteWorkspaceModel;
  onReports: () => void;
  onSnapshot: () => void;
  onDeveloperFiles: () => void;
  onRetry: () => void;
  onFixConnection: () => void;
  onPartialSummary: () => void;
  onMockAction: MockActionHandler;
}

export function ScanResultScreen({ mode, site, onReports, onSnapshot, onDeveloperFiles, onRetry, onFixConnection, onPartialSummary, onMockAction }: ScanResultScreenProps) {
  if (mode === "failed") {
    return (
      <div className="page">
        <WarningBanner tone="danger">
          <b>Failed.</b> A required collector could not complete, so this scan is not complete. No site data was changed; partial data is kept for inspection.
        </WarningBanner>
        <PageHeader
          breadcrumb={`${site.name} · Scan result`}
          title="Scan failed"
          subtitle="Stopped after 1m 12s · Jul 2, 2026 · 10:41"
          actions={<StatusPill status="err" label="Failed" dot />}
        />
        <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="pill pill--err" style={{ alignSelf: "flex-start" }}>
            Reason: connection lost during scan
          </span>
          <div className="body">Form fields could not be read for all apps — the session dropped mid-scan. Reconnect and retry.</div>
          <div className="small muted2">Partial capture: 2 of 4 apps have usable structure in the snapshot.</div>
        </div>
        <div className="btn-row">
          <PrimaryActionButton label="Retry scan" onClick={onRetry} />
          <SecondaryActionButton label="Fix connection" onClick={onFixConnection} />
          <SecondaryActionButton label="Review partial scan summary" variant="ghost" onClick={onPartialSummary} />
        </div>
      </div>
    );
  }

  if (mode === "completed") {
    return (
      <div className="page">
        <WarningBanner tone="ok">
          <b>Completed.</b> All required data was captured. The local snapshot is up to date.
        </WarningBanner>
        <PageHeader
          breadcrumb={`${site.name} · Scan result`}
          title="Scan completed"
          subtitle="Finished in 5m 07s · Jul 2, 2026 · 10:35"
          actions={<StatusPill status="ok" label="Completed" dot />}
        />
        <div style={{ width: "100%" }}>
          <KpiGrid
            columns={3}
            items={[
              { number: "4", label: "Apps captured" },
              { number: "5", label: "Plugins" },
              { number: "4", label: "Redactions" },
            ]}
          />
        </div>
        <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="body">
            Required: <b>69 / 69 ok</b>
          </div>
          <div className="body">Plugin configs captured: 5 of 5</div>
          <div className="body">Dependency candidates: 9</div>
        </div>
        <div className="btn-row">
          <PrimaryActionButton label="▦ View reports" onClick={onReports} />
          <SecondaryActionButton label="⛃ Open Local Snapshot" onClick={onSnapshot} />
          <SecondaryActionButton label="〈〉 Open developer files" variant="ghost" onClick={onDeveloperFiles} />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <WarningBanner tone="warn">
        <b>Completed with warnings.</b> All required data was captured. Some optional captures were skipped — safe to ignore or retry.
      </WarningBanner>
      <PageHeader
        breadcrumb={`${site.name} · Scan result`}
        title="Completed with warnings"
        subtitle="Finished in 5m 41s · Jul 2, 2026 · 10:35"
        actions={<StatusPill status="warn" label="Completed with warnings" dot />}
      />
      <KpiGrid
        columns={3}
        items={[
          { number: "68/68", label: "Required ok" },
          { number: "1", label: "Optional skipped" },
          { number: "2", label: "Warnings" },
        ]}
      />
      <div className="card">
        <div className="card-pad" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="h3">Warnings</span>
        </div>
        <div className="li">
          <StatusPill status="warn" label="Skipped" dot />
          <div className="grow body">1 plugin config — runtime unavailable</div>
          <SecondaryActionButton label="Retry item" size="sm" onClick={() => onMockAction("Preview retry queued for plugin config. No runner was started.")} />
        </div>
        <div className="li">
          <StatusPill status="warn" label="Skipped" dot />
          <div className="grow body">1 app — screenshots unavailable</div>
          <SecondaryActionButton label="Retry item" size="sm" onClick={() => onMockAction("Preview retry queued for app screenshots. No runner was started.")} />
        </div>
      </div>
      <div className="btn-row">
        <PrimaryActionButton label="▦ View reports" onClick={onReports} />
        <SecondaryActionButton label="⛃ Open Local Snapshot" onClick={onSnapshot} />
        <SecondaryActionButton label="Re-run skipped" onClick={onRetry} />
      </div>
    </div>
  );
}
