import { useState } from "react";
import { ConnectionTestPanel, PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import { createFailedConnectionResult, createPassedConnectionResult, createTestingConnectionResult } from "../mockConnection";
import { overviewKpis } from "../mockData";
import type { ConnectionTestResult, ConnectionTestTarget, MockActionHandler } from "../types";
import { KpiGrid, PageHeader } from "./shared";

interface SiteOverviewScreenProps {
  onRunScan: () => void;
  onSnapshot: () => void;
  onReports: () => void;
  onDeveloperFiles: () => void;
  onMockAction: MockActionHandler;
}

export function SiteOverviewScreen({ onRunScan, onSnapshot, onReports, onDeveloperFiles, onMockAction }: SiteOverviewScreenProps) {
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);
  const connectionTarget: ConnectionTestTarget = {
    siteName: "Client A Production",
    domain: "client-a.cybozu.com",
    authProfile: "Client A Admin",
  };

  function runConnectionTest(outcome: "passed" | "failed" = "passed") {
    setConnectionResult(createTestingConnectionResult(connectionTarget));
    window.setTimeout(() => {
      setConnectionResult(outcome === "failed" ? createFailedConnectionResult(connectionTarget) : createPassedConnectionResult(connectionTarget));
      if (outcome === "passed") {
        onMockAction("Client A Production connection test passed. No kintone request was sent.", { tone: "ok" });
      }
    }, 450);
  }

  return (
    <div className="page">
      <PageHeader
        breadcrumb="Client A Production"
        title="Overview"
        subtitle="client-a.cybozu.com · Client A Admin"
        actions={
          <>
            <StatusPill status="ok" label="Connected" dot />
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
      <KpiGrid items={overviewKpis} />
      <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="between">
          <h2 className="h2">Local snapshot</h2>
          <StatusPill status="warn" label="Completed with warnings" dot />
        </div>
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
              ~/KintoneDiscovery/client-a/snapshot
            </div>
          </div>
        </div>
        <div className="divider" />
        <div className="btn-row">
          <SecondaryActionButton label="⛃ Open Local Snapshot" onClick={onSnapshot} />
          <SecondaryActionButton label="▦ View reports" onClick={onReports} />
          <SecondaryActionButton label="〈〉 Open developer files" onClick={onDeveloperFiles} />
          <SecondaryActionButton label="Open site folder" variant="ghost" onClick={() => onMockAction("Open site folder bridge stub triggered. No Windows Explorer window was opened.")} />
        </div>
      </div>
    </div>
  );
}
