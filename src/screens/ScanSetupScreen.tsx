import { useEffect, useMemo, useState } from "react";
import { PrimaryActionButton, ScanPresetCard, SecondaryActionButton, StatusPill } from "../components";
import { presets } from "../mockData";
import type { MockActionHandler, ScanPreset, SiteWorkspaceModel } from "../types";
import { PageHeader } from "./shared";

interface ScanSetupScreenProps {
  site: SiteWorkspaceModel;
  startRequested?: boolean;
  onAdvanced: () => void;
  onMockAction: MockActionHandler;
}

type InlineScanState = "idle" | "running" | "succeeded" | "failed" | "canceled";

const collectorRows = [
  { status: "Done", tone: "ok" as const, label: "REST metadata" },
  { status: "Done", tone: "ok" as const, label: "Plugin inventory" },
  { status: "Running", tone: "run" as const, label: "Browser plugin saved config" },
  { status: "Queued", tone: "idle" as const, label: "Developer file generation" },
];

export function ScanSetupScreen({ site, startRequested = false, onAdvanced, onMockAction }: ScanSetupScreenProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<ScanPreset["id"]>("standard");
  const [scanState, setScanState] = useState<InlineScanState>("idle");
  const [showDetails, setShowDetails] = useState(false);
  const [handledStartRequest, setHandledStartRequest] = useState(false);
  const presetCards = useMemo(() => presets.map((preset) => ({ ...preset, selected: preset.id === selectedPresetId })), [selectedPresetId]);
  const selectedPreset = presetCards.find((preset) => preset.id === selectedPresetId);

  function startInlineScan() {
    setScanState("running");
    setShowDetails(false);
  }

  useEffect(() => {
    if (!startRequested && handledStartRequest) {
      setHandledStartRequest(false);
      return;
    }

    if (startRequested && !handledStartRequest) {
      startInlineScan();
      setHandledStartRequest(true);
    }
  }, [handledStartRequest, startRequested]);

  function handleReviewStart() {
    if (selectedPresetId === "full") {
      onAdvanced();
      return;
    }
    startInlineScan();
  }

  function handleAdvancedOptions() {
    if (selectedPresetId !== "full") {
      setSelectedPresetId("full");
      onMockAction("Advanced options are for Full Discovery. Switching to Full Discovery configuration.");
    }
    onAdvanced();
  }

  return (
    <div className="page">
      <PageHeader
        breadcrumb={`${site.name} · Scan`}
        title="Choose a scan preset"
        titleMeta={scanState === "running" ? <StatusPill status="run" label="Running" dot /> : null}
        subtitle={scanState === "running" ? `${selectedPreset?.title ?? "Standard Scan"} · ${site.selectedApps} apps · sensitive options off` : `${site.selectedApps} apps selected · app list fetched 2 hours ago`}
        actions={
          scanState === "running" ? (
            <PrimaryActionButton label="Cancel scan" tone="danger" onClick={() => setScanState("canceled")} />
          ) : (
            <SecondaryActionButton label="⟳ Reload app list" size="sm" onClick={() => onMockAction("Sample app list reloaded. No kintone request was sent.")} />
          )
        }
      />
      <InlineScanStatus
        state={scanState}
        showDetails={showDetails}
        onToggleDetails={() => setShowDetails((shown) => !shown)}
        onRetry={startInlineScan}
        onDismiss={() => setScanState("idle")}
        onFinishMock={() => setScanState("succeeded")}
        onFailMock={() => setScanState("failed")}
      />
      <div className="preset-grid" role="radiogroup" aria-label="Scan preset">
        {presetCards.map((preset) => (
          <ScanPresetCard key={preset.id} preset={preset} onSelect={setSelectedPresetId} onConfigure={handleAdvancedOptions} />
        ))}
      </div>
      <div className="between">
        <div>
          <SecondaryActionButton label="▾ Show advanced options" variant="ghost" onClick={handleAdvancedOptions} />
          <div className="small muted2" style={{ marginTop: 4 }}>
            Advanced options apply to Full Discovery only.
          </div>
        </div>
        <div className="rowc">
          <span className="small muted2">17 required categories · always on 🔒</span>
          <PrimaryActionButton label={selectedPreset?.opensConfig ? "Configure & review →" : scanState === "running" ? "Scan running" : "Review & start →"} disabled={scanState === "running"} onClick={handleReviewStart} />
        </div>
      </div>
    </div>
  );
}

function InlineScanStatus({
  state,
  showDetails,
  onToggleDetails,
  onRetry,
  onDismiss,
  onFinishMock,
  onFailMock,
}: {
  state: InlineScanState;
  showDetails: boolean;
  onToggleDetails: () => void;
  onRetry: () => void;
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
          <SecondaryActionButton label={showDetails ? "Hide details" : "Details"} size="sm" variant="ghost" onClick={onToggleDetails} />
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
        <SecondaryActionButton label="Dismiss" size="sm" variant="ghost" onClick={onDismiss} />
      </div>
    </div>
  );
}
