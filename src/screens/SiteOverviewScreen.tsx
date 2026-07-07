import { useState } from "react";
import { ConnectionTestPanel, PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import { createFailedConnectionResult, createPassedConnectionResult, createTestingConnectionResult } from "../mockConnection";
import { overviewKpisForSite } from "../mockData";
import type { ConnectionTestResult, ConnectionTestTarget, MockActionHandler, SiteWorkspaceModel } from "../types";
import { KpiGrid, PageHeader } from "./shared";

interface SiteOverviewScreenProps {
  site: SiteWorkspaceModel;
  onRunScan: () => void;
  onSnapshot: () => void;
  onReports: () => void;
  onDeveloperFiles: () => void;
  onMockAction: MockActionHandler;
}

export function SiteOverviewScreen({ site, onRunScan, onSnapshot, onReports, onDeveloperFiles, onMockAction }: SiteOverviewScreenProps) {
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);
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

  return (
    <div className="page">
      <PageHeader
        breadcrumb={`${site.projectName} · ${site.name}`}
        title="Overview"
        subtitle={`${site.domain} · ${site.profile}`}
        actions={
          <>
            <StatusPill status={site.tone} label={site.status} dot />
            {connectionResult?.status === "testing" ? <StatusPill status="run" label="Testing..." dot /> : null}
            {connectionResult?.status === "passed" ? <span className="inline-test-status">Last test passed just now</span> : null}
            <SecondaryActionButton label="Test connection" onClick={() => runConnectionTest("passed")} />
            <PrimaryActionButton label="◎ Run scan" onClick={onRunScan} />
          </>
        }
      />
      {connectionResult?.status === "failed" ? (
        <ConnectionTestPanel
          result={connectionResult}
          onRetry={() => runConnectionTest("passed")}
          onDismiss={() => setConnectionResult(null)}
        />
      ) : null}
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
              <SecondaryActionButton label="Open site folder" variant="ghost" onClick={() => onMockAction("Folder opening is not connected yet. No Windows Explorer window was opened.")} />
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="h3">No local snapshot for this site yet</div>
              <div className="small muted2" style={{ marginTop: 4 }}>
                Run a read-only scan to create the first local snapshot for {site.name}.
              </div>
            </div>
            <div className="btn-row">
              <PrimaryActionButton label="Run scan" onClick={onRunScan} />
              <SecondaryActionButton label="Open site folder" variant="ghost" onClick={() => onMockAction("Folder opening is not connected yet. No Windows Explorer window was opened.")} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
