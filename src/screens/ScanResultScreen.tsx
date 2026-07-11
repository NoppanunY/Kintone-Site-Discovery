import { PrimaryActionButton, SecondaryActionButton, StatusPill, WarningBanner } from "../components";
import type { ScanRun } from "@kintone-site-discovery/core";
import type { MockActionHandler, SiteWorkspaceModel } from "../types";
import { KpiGrid, PageHeader, ScanAppSelectionNotice } from "./shared";

type ResultMode = "completed" | "warnings" | "failed";

interface ScanResultScreenProps {
  mode: ResultMode;
  site: SiteWorkspaceModel;
  canStartScan: boolean;
  onReports: () => void;
  onSnapshot: () => void;
  onDeveloperFiles: () => void;
  onChooseApps: () => void;
  onRetry: () => void;
  onFixConnection: () => void;
  onPartialSummary: () => void;
  onMockAction: MockActionHandler;
  scanRun?: ScanRun | null;
}

export function ScanResultScreen({ mode, site, canStartScan, onReports, onSnapshot, onDeveloperFiles, onChooseApps, onRetry, onFixConnection, onPartialSummary, onMockAction, scanRun }: ScanResultScreenProps) {
  const result = scanRun?.result;
  const hasSnapshot = Boolean(scanRun?.snapshotId);
  if (mode === "failed") {
    const error = result?.error;
    return (
      <div className="page">
        {!canStartScan ? <ScanAppSelectionNotice onChooseApps={onChooseApps} /> : null}
        <WarningBanner tone="danger">
          <b>Failed.</b>{" "}
          {error?.partialDataKept
            ? "A required collector could not complete. No site data was changed; partial data is kept for inspection."
            : "A required collector could not complete. No site data was changed and no current snapshot was updated."}
        </WarningBanner>
        <PageHeader
          breadcrumb={`${site.name} · Scan result`}
          title="Scan failed"
          subtitle={scanRun ? `Stopped after ${formatDuration(result?.durationMs ?? 0)} · ${formatDateTime(scanRun.finishedAt ?? scanRun.startedAt)}` : "Stopped after 1m 12s · Jul 2, 2026 · 10:41"}
          actions={<StatusPill status="err" label="Failed" dot />}
        />
        <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="pill pill--err" style={{ alignSelf: "flex-start" }}>
            Reason: {error?.title ?? "connection lost during scan"}
          </span>
          <div className="body">{error?.body ?? "Form fields could not be read for all apps — the session dropped mid-scan. Reconnect and retry."}</div>
          <div className="small muted2">
            {error?.partialDataKept ? `Partial capture: ${result?.appsCaptured ?? 0} of ${scanRun?.selectedAppIds.length ?? site.selectedApps} apps have usable structure in the snapshot.` : "No current snapshot was updated. Retry after fixing the required collector failure."}
          </div>
        </div>
        <div className="btn-row">
          <PrimaryActionButton label="Retry scan" disabled={!canStartScan} onClick={onRetry} />
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
          <b>Completed.</b> All required collectors completed. {hasSnapshot ? "The local snapshot is up to date." : "No snapshot was written."}
        </WarningBanner>
        <PageHeader
          breadcrumb={`${site.name} · Scan result`}
          title="Scan completed"
          subtitle={scanRun ? `Finished in ${formatDuration(result?.durationMs ?? 0)} · ${formatDateTime(scanRun.finishedAt ?? scanRun.startedAt)}` : "Finished in 5m 07s · Jul 2, 2026 · 10:35"}
          actions={<StatusPill status="ok" label="Completed" dot />}
        />
        <div style={{ width: "100%" }}>
          <KpiGrid
            columns={3}
            items={[
              { number: String(result?.appsCaptured ?? 4), label: "Apps captured" },
              { number: String(result?.pluginsCaptured ?? 5), label: "Plugins" },
              { number: String(result?.redaction.totalRedactions ?? 4), label: "Redactions" },
            ]}
          />
        </div>
        <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="body">
            Required: <b>{result ? `${result.requiredOk} / ${result.requiredTotal} ok` : "69 / 69 ok"}</b>
          </div>
          <div className="body">Collectors: {result?.collectors.filter((collector) => collector.status === "done").length ?? 0} done</div>
          <div className="body">{hasSnapshot ? "Snapshot artifacts are available." : "Snapshot artifacts are not available."}</div>
        </div>
        <div className="btn-row">
          <PrimaryActionButton label="▦ View reports" disabled onClick={onReports} />
          <SecondaryActionButton label="⛃ Open Local Snapshot" disabled={!hasSnapshot} onClick={onSnapshot} />
          <SecondaryActionButton label="〈〉 Open developer files" variant="ghost" disabled onClick={onDeveloperFiles} />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {!canStartScan ? <ScanAppSelectionNotice onChooseApps={onChooseApps} /> : null}
      <WarningBanner tone="warn">
        <b>Completed with warnings.</b> All required collectors completed. Some optional captures were skipped. {hasSnapshot ? "The snapshot is usable." : "No snapshot was written."}
      </WarningBanner>
      <PageHeader
        breadcrumb={`${site.name} · Scan result`}
        title="Completed with warnings"
        subtitle={scanRun ? `Finished in ${formatDuration(result?.durationMs ?? 0)} · ${formatDateTime(scanRun.finishedAt ?? scanRun.startedAt)}` : "Finished in 5m 41s · Jul 2, 2026 · 10:35"}
        actions={<StatusPill status="warn" label="Completed with warnings" dot />}
      />
      <KpiGrid
        columns={3}
        items={[
          { number: result ? `${result.requiredOk}/${result.requiredTotal}` : "68/68", label: "Required ok" },
          { number: String(result?.optionalSkipped ?? 1), label: "Optional skipped" },
          { number: String(result?.warningCount ?? 2), label: "Warnings" },
        ]}
      />
      <div className="card">
        <div className="card-pad" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="h3">Warnings</span>
        </div>
        {(result?.collectors.filter((collector) => collector.status === "skipped") ?? []).map((collector) => (
          <div className="li" key={collector.key}>
            <StatusPill status="warn" label="Skipped" dot />
            <div className="grow body">{collector.label} — {collector.message ?? "optional, continuing"}</div>
            <SecondaryActionButton label="Retry item" size="sm" disabled={!canStartScan} onClick={() => onMockAction("Retry item is not wired separately yet. Run the scan again from setup.")} />
          </div>
        ))}
        {result && result.collectors.every((collector) => collector.status !== "skipped") ? (
          <div className="li">
            <div className="grow body">No skipped collectors were reported.</div>
          </div>
        ) : null}
      </div>
      <div className="btn-row">
        <PrimaryActionButton label="▦ View reports" disabled onClick={onReports} />
        <SecondaryActionButton label="⛃ Open Local Snapshot" disabled={!hasSnapshot} onClick={onSnapshot} />
        <SecondaryActionButton label="Re-run skipped" disabled={!canStartScan} onClick={onRetry} />
      </div>
    </div>
  );
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds.toString().padStart(2, "0")}s` : `${seconds}s`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
