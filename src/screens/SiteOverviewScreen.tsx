import { useState } from "react";
import { ConnectionTestPanel, PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import { createFailedConnectionResult, createPassedConnectionResult, createTestingConnectionResult } from "../mockConnection";
import { overviewKpisForSite } from "../mockData";
import type { ConnectionTestResult, ConnectionTestTarget, MockActionHandler, SiteWorkspaceModel } from "../types";
import { KpiGrid, PageHeader } from "./shared";

interface SiteOverviewScreenProps {
  site: SiteWorkspaceModel;
  onScanSettings: () => void;
  onOpenFullScan: () => void;
  onSnapshot: () => void;
  onReports: () => void;
  onDeveloperFiles: () => void;
  onMockAction: MockActionHandler;
}

type OverviewScanState = "idle" | "running" | "succeeded" | "failed" | "canceled";

const collectorRows = [
  { status: "Done", tone: "ok" as const, label: "REST metadata" },
  { status: "Done", tone: "ok" as const, label: "App and plugin inventory" },
  { status: "Running", tone: "run" as const, label: "Browser plugin saved config" },
  { status: "Queued", tone: "idle" as const, label: "Snapshot generation" },
];

export function SiteOverviewScreen({ site, onScanSettings, onOpenFullScan, onSnapshot, onReports, onDeveloperFiles, onMockAction }: SiteOverviewScreenProps) {
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);
  const [scanState, setScanState] = useState<OverviewScanState>("idle");
  const [showScanDetails, setShowScanDetails] = useState(false);
  const connectionTarget: ConnectionTestTarget = {
    siteName: site.name,
    domain: site.domain,
    authProfile: site.profile,
  };

  function runConnectionTest(outcome: "passed" | "failed" = "passed") {
    setConnectionResult(createTestingConnectionResult(connectionTarget));
    window.setTimeout(() => {
      setConnectionResult(outcome === "failed" ? createFailedConnectionResult(connectionTarget) : createPassedConnectionResult(connectionTarget));
      if (outcome === "passed") {
        onMockAction(`${site.name} connection test passed. No kintone request was sent.`, { tone: "ok" });
      }
    }, 450);
  }

  function startOverviewScan() {
    setScanState("running");
    setShowScanDetails(false);
  }

  return (
    <div className="page">
      <PageHeader
        breadcrumb={`${site.projectName} · ${site.name}`}
        title="Overview"
        titleMeta={scanState === "running" ? <StatusPill status="run" label="Scanning" dot /> : null}
        subtitle={scanState === "running" ? `Running scan · Standard Scan · ${site.selectedApps} apps · sensitive options off` : `${site.domain} · ${site.profile}`}
        actions={
          scanState === "running" ? (
            <>
              <SecondaryActionButton label="Change settings" onClick={onScanSettings} />
              <PrimaryActionButton label="Cancel scan" tone="danger" onClick={() => setScanState("canceled")} />
            </>
          ) : (
            <>
              <StatusPill status={site.tone} label={site.status} dot />
              {connectionResult?.status === "testing" ? <StatusPill status="run" label="Testing..." dot /> : null}
              {connectionResult?.status === "passed" ? <span className="inline-test-status">Last test passed just now</span> : null}
              <SecondaryActionButton label="Test connection" onClick={() => runConnectionTest("passed")} />
              <PrimaryActionButton label="◎ Run scan" onClick={startOverviewScan} />
            </>
          )
        }
      />
      {connectionResult?.status === "failed" ? (
        <ConnectionTestPanel
          result={connectionResult}
          onRetry={() => runConnectionTest("passed")}
          onDismiss={() => setConnectionResult(null)}
        />
      ) : null}
      <OverviewScanStatus
        state={scanState}
        showDetails={showScanDetails}
        onToggleDetails={() => setShowScanDetails((shown) => !shown)}
        onRetry={startOverviewScan}
        onChangeSettings={onScanSettings}
        onOpenFullScan={onOpenFullScan}
        onDismiss={() => setScanState("idle")}
        onFinishMock={() => setScanState("succeeded")}
        onFailMock={() => setScanState("failed")}
      />
      <KpiGrid items={overviewKpisForSite(site)} />
      <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="between">
          <h2 className="h2">Local snapshot</h2>
          <StatusPill status={site.hasSnapshot ? "warn" : "idle"} label={site.hasSnapshot ? "Completed with warnings" : "No snapshot yet"} dot />
        </div>
        {site.hasSnapshot ? (
          <>
            <div className="rowc" style={{ gap: 24 }}>
              <div>
                <div className="cap">Captured</div>
                <div className="h3" style={{ marginTop: 3 }}>
                  Jul 2, 2026 · 10:35
                </div>
              </div>
              <div>
                <div className="cap">Size on disk</div>
                <div className="h3" style={{ marginTop: 3 }}>
                  48.2 MB
                </div>
              </div>
              <div>
                <div className="cap">Snapshot folder</div>
                <div className="mono small" style={{ marginTop: 5 }}>
                  ~/KintoneDiscovery/{site.id}/snapshot
                </div>
              </div>
            </div>
            <div className="divider" />
            <div className="btn-row">
              <SecondaryActionButton label="⛃ Open Local Snapshot" onClick={onSnapshot} />
              <SecondaryActionButton label="▦ View reports" onClick={onReports} />
              <SecondaryActionButton label="〈〉 Open developer files" onClick={onDeveloperFiles} />
              <SecondaryActionButton label="Open project folder" variant="ghost" onClick={() => onMockAction("Project folder opening is not connected yet. No Windows Explorer window was opened.")} />
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="h3">No local snapshot for this project yet</div>
              <div className="small muted2" style={{ marginTop: 4 }}>
                Run a read-only scan to create the first local snapshot for {site.projectName}.
              </div>
            </div>
            <div className="btn-row">
              <PrimaryActionButton label="Run scan" onClick={startOverviewScan} />
              <SecondaryActionButton label="Open project folder" variant="ghost" onClick={() => onMockAction("Project folder opening is not connected yet. No Windows Explorer window was opened.")} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OverviewScanStatus({
  state,
  showDetails,
  onToggleDetails,
  onRetry,
  onChangeSettings,
  onOpenFullScan,
  onDismiss,
  onFinishMock,
  onFailMock,
}: {
  state: OverviewScanState;
  showDetails: boolean;
  onToggleDetails: () => void;
  onRetry: () => void;
  onChangeSettings: () => void;
  onOpenFullScan: () => void;
  onDismiss: () => void;
  onFinishMock: () => void;
  onFailMock: () => void;
}) {
  if (state === "idle") {
    return null;
  }

  if (state === "running") {
    return (
      <div className="snapshot-rerun">
        <div className="snapshot-rerun__top">
          <div className="rowc">
            <StatusPill status="run" label="Scanning" dot />
            <span className="small muted">62% · plugin saved config</span>
          </div>
          <div className="rowc">
            <SecondaryActionButton label="Full scanning" size="sm" onClick={onOpenFullScan} />
            <SecondaryActionButton label={showDetails ? "Hide details" : "Details"} size="sm" variant="ghost" onClick={onToggleDetails} />
          </div>
        </div>
        <div className="progress" aria-label="Scan progress">
          <i style={{ width: "62%" }} />
        </div>
        <div className="small muted2">The current snapshot remains active until this run completes.</div>
        {showDetails ? (
          <div className="snapshot-rerun__details">
            {collectorRows.map((row) => (
              <div className="snapshot-rerun__row" key={row.label}>
                <StatusPill status={row.tone} label={row.status} dot />
                <span className="body">{row.label}</span>
              </div>
            ))}
            <div className="snapshot-rerun__mock-actions">
              <SecondaryActionButton label="Finish preview run" size="sm" onClick={onFinishMock} />
              <SecondaryActionButton label="Fail preview run" size="sm" variant="ghost" onClick={onFailMock} />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const failed = state === "failed";
  const succeeded = state === "succeeded";
  return (
    <div className={`snapshot-status-line ${succeeded ? "snapshot-status-line--ok" : failed ? "snapshot-status-line--err" : "snapshot-status-line--idle"}`}>
      <div className="rowc">
        <StatusPill status={succeeded ? "ok" : failed ? "err" : "idle"} label={succeeded ? "Completed" : failed ? "Failed" : "Canceled"} dot />
        <span className="small muted">
          {succeeded ? "Preview scan completed. No snapshot was written." : failed ? "Preview scan failed. Current snapshot was not replaced." : "Preview scan canceled. Current snapshot was not replaced."}
        </span>
      </div>
      <div className="rowc">
        {succeeded ? null : <SecondaryActionButton label="Retry" size="sm" onClick={onRetry} />}
        {failed ? <SecondaryActionButton label="Change settings" size="sm" onClick={onChangeSettings} /> : null}
        <SecondaryActionButton label="Dismiss" size="sm" variant="ghost" onClick={onDismiss} />
      </div>
    </div>
  );
}
