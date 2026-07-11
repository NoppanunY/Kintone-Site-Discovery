import { useState } from "react";
import { ConnectionTestPanel, PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import { createFailedConnectionResult, createPassedConnectionResult, createTestingConnectionResult } from "../mockConnection";
import { overviewKpisForSite } from "../mockData";
import type { ConnectionTestResult, ConnectionTestTarget, MockActionHandler, SensitiveOption, SiteWorkspaceModel } from "../types";
import { ScanRunPanel, type ScanRunPanelProps } from "./ScanRunningScreen";
import { KpiGrid, PageHeader, ScanAppSelectionNotice, SensitiveScanConfirmationModal } from "./shared";

interface SiteOverviewScreenProps {
  site: SiteWorkspaceModel;
  canStartScan: boolean;
  scanPanelProps: Omit<ScanRunPanelProps, "variant" | "source" | "site" | "shouldStartNew" | "onCancel">;
  armedSensitiveOptions: SensitiveOption[];
  onOpenScanSetup: () => void;
  onChooseApps: () => void;
  onSnapshot: () => void;
  onReports: () => void;
  onDeveloperFiles: () => void;
  onMockAction: MockActionHandler;
  onOpenProjectFolder: () => void;
}

export function SiteOverviewScreen({ site, canStartScan, scanPanelProps, armedSensitiveOptions, onOpenScanSetup, onChooseApps, onSnapshot, onReports, onDeveloperFiles, onMockAction, onOpenProjectFolder }: SiteOverviewScreenProps) {
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);
  const [inlineScanKey, setInlineScanKey] = useState(0);
  const [showInlineScan, setShowInlineScan] = useState(false);
  const [showSensitiveConfirmation, setShowSensitiveConfirmation] = useState(false);
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
    if (!canStartScan) {
      onMockAction("Choose at least one app before starting a scan.", { tone: "warn" });
      return;
    }

    if (armedSensitiveOptions.length > 0) {
      setShowSensitiveConfirmation(true);
      return;
    }

    startInlineScan();
  }

  function startInlineScan() {
    setShowSensitiveConfirmation(false);
    setInlineScanKey((key) => key + 1);
    setShowInlineScan(true);
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
            <PrimaryActionButton label="◎ Run scan" disabled={!canStartScan || showInlineScan} onClick={startOverviewScan} />
          </>
        }
      />
      {!canStartScan ? <ScanAppSelectionNotice onChooseApps={onChooseApps} /> : null}
      {showSensitiveConfirmation ? <SensitiveScanConfirmationModal canStartScan={canStartScan} armedOptions={armedSensitiveOptions} onCancel={() => setShowSensitiveConfirmation(false)} onConfirm={startInlineScan} /> : null}
      {showInlineScan ? (
        <ScanRunPanel
          key={inlineScanKey}
          {...scanPanelProps}
          variant="compact"
          source="new"
          site={site}
          shouldStartNew
          onCancel={() => setShowInlineScan(false)}
          onChangeSettings={onOpenScanSetup}
        />
      ) : null}
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
              <SecondaryActionButton label="Open project folder" variant="ghost" onClick={onOpenProjectFolder} />
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
              <PrimaryActionButton label="Run scan" disabled={!canStartScan || showInlineScan} onClick={startOverviewScan} />
              <SecondaryActionButton label="Open project folder" variant="ghost" onClick={onOpenProjectFolder} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
