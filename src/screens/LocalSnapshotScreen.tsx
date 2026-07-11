import type { ReactNode } from "react";
import { useState } from "react";
import { PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import type { MockActionHandler, SensitiveOption, SiteWorkspaceModel } from "../types";
import { ScanRunPanel, type ScanRunPanelProps } from "./ScanRunningScreen";
import { KpiGrid, PageHeader, ScanAppSelectionNotice, SensitiveScanConfirmationModal } from "./shared";

export function LocalSnapshotScreen({
  site,
  canStartScan,
  scanPanelProps,
  armedSensitiveOptions,
  onOpenScanSetup,
  onChooseApps,
  onMockAction,
  onOpenFolder,
}: {
  site: SiteWorkspaceModel;
  canStartScan: boolean;
  scanPanelProps: Omit<ScanRunPanelProps, "variant" | "source" | "site" | "shouldStartNew" | "onCancel">;
  armedSensitiveOptions: SensitiveOption[];
  onOpenScanSetup: () => void;
  onChooseApps: () => void;
  onMockAction: MockActionHandler;
  onOpenFolder: () => void;
}) {
  const hasSnapshot = site.hasSnapshot;
  const [inlineScanKey, setInlineScanKey] = useState(0);
  const [showInlineScan, setShowInlineScan] = useState(false);
  const [showSensitiveConfirmation, setShowSensitiveConfirmation] = useState(false);

  const startRerun = () => {
    if (!canStartScan) {
      onMockAction("Choose at least one app before starting or re-running a scan.", { tone: "warn" });
      return;
    }

    if (armedSensitiveOptions.length > 0) {
      setShowSensitiveConfirmation(true);
      return;
    }

    startInlineScan();
  };

  const startInlineScan = () => {
    setShowSensitiveConfirmation(false);
    setInlineScanKey((key) => key + 1);
    setShowInlineScan(true);
  };

  const kpis = hasSnapshot
      ? [
        { number: "48.2", label: "MB on disk" },
          { number: String(site.selectedApps), label: "Apps" },
          { number: String(site.pluginsCaptured), label: "Plugins" },
          { number: String(site.redactions), label: "Redactions" },
        ]
      : [
          { number: "0", label: "MB on disk" },
          { number: "0", label: "Apps" },
          { number: "0", label: "Plugins" },
          { number: "0", label: "Redactions" },
        ];

  return (
    <div className="page">
      <PageHeader
        breadcrumb={`${site.name} · Local Snapshot`}
        title="Local Snapshot"
        subtitle={hasSnapshot ? "Current local snapshot for this project." : "Run a read-only scan to create the first local snapshot."}
        actions={
          <>
            {hasSnapshot ? <SecondaryActionButton label="Open snapshot folder" onClick={onOpenFolder} /> : null}
            <PrimaryActionButton label={hasSnapshot ? "Re-run scan" : "Run scan"} disabled={!canStartScan || showInlineScan} onClick={startRerun} />
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
          source="rerun"
          site={site}
          shouldStartNew
          onCancel={() => setShowInlineScan(false)}
          onChangeSettings={onOpenScanSetup}
        />
      ) : null}
      <KpiGrid items={kpis} />
      {hasSnapshot ? (
        <>
          <div className="card">
            <div className="card-pad between" style={{ borderBottom: "1px solid var(--border)" }}>
              <span className="h2">Contents</span>
              <StatusPill status="warn" label="Completed with warnings" dot />
            </div>
            <SnapshotContent icon="📱" label="App configurations & forms" value={`${site.selectedApps} apps`} />
            <SnapshotContent icon="🧩" label="Plugin inventory & saved config" value={`${site.pluginsCaptured} plugins`} />
            <SnapshotContent icon="📄" label={<>Customization JS / CSS files <span className="small muted2">· order preserved</span></>} value="31 files" />
            <SnapshotContent icon="👥" label="Users, groups, departments & spaces" value="included" />
            <SnapshotContent icon="🔗" label="Dependency & preview-vs-live diff data" value="included" />
          </div>
          <div className="card card-pad between">
            <div className="rowc">
              <StatusPill status="ok" label="Integrity OK" dot />
              <span className="small muted">Captured Jul 2, 2026 · 10:35</span>
            </div>
            <span className="mono small muted2">snapshot/manifest.json</span>
          </div>
        </>
      ) : (
        <div className="card card-pad">
          <div className="h3">No local snapshot yet</div>
          <div className="body muted" style={{ marginTop: 6 }}>
            Run a read-only scan to create the first local snapshot for {site.name}.
          </div>
        </div>
      )}
    </div>
  );
}

function SnapshotContent({ icon, label, value }: { icon: string; label: ReactNode; value: string }) {
  return (
    <div className="li">
      <span className="grow rowc">
        <span style={{ width: 20 }}>{icon}</span>
        <div className="body">{label}</div>
      </span>
      <span className="small muted2">{value}</span>
    </div>
  );
}
