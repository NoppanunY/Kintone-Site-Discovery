import { useState, type ReactNode } from "react";
import { PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import type { MockActionHandler } from "../types";
import { KpiGrid, PageHeader } from "./shared";

type SnapshotRerunState = "idle" | "running" | "succeeded" | "failed" | "canceled";

const collectorRows = [
  { status: "Done", tone: "ok" as const, label: "REST metadata" },
  { status: "Done", tone: "ok" as const, label: "Plugin inventory" },
  { status: "Running", tone: "run" as const, label: "Browser plugin saved config" },
  { status: "Queued", tone: "idle" as const, label: "Developer file generation" },
];

export function LocalSnapshotScreen({ onChangeSettings, onMockAction }: { onChangeSettings: () => void; onMockAction: MockActionHandler }) {
  const [rerunState, setRerunState] = useState<SnapshotRerunState>("idle");
  const [showDetails, setShowDetails] = useState(false);
  const [snapshotUpdated, setSnapshotUpdated] = useState(false);
  const isRunning = rerunState === "running";
  const titleMeta = rerunState === "idle" ? undefined : <SnapshotTitleMeta state={rerunState} />;

  const startRerun = () => {
    setRerunState("running");
    setShowDetails(false);
  };

  const finishMockRun = () => {
    setSnapshotUpdated(true);
    setRerunState("succeeded");
  };

  const kpis = snapshotUpdated
    ? [
        { number: "49.1", label: "MB on disk" },
        { number: "13", label: "Apps" },
        { number: "6", label: "Plugins" },
        { number: "5", label: "Redactions" },
      ]
    : [
        { number: "48.2", label: "MB on disk" },
        { number: "12", label: "Apps" },
        { number: "5", label: "Plugins" },
        { number: "4", label: "Redactions" },
      ];

  return (
    <div className="page">
      <PageHeader
        breadcrumb="Client A Production · Local Snapshot"
        title="Local Snapshot"
        titleMeta={titleMeta}
        subtitle={isRunning ? "Re-running scan · Standard Scan · 4 apps · sensitive options off" : "The current local snapshot for this site. Reports and developer files are generated from it."}
        actions={
          isRunning ? (
            <>
              <SecondaryActionButton label="Change settings" size="sm" variant="ghost" onClick={onChangeSettings} />
              <PrimaryActionButton label="Cancel scan" tone="danger" onClick={() => setRerunState("canceled")} />
            </>
          ) : (
            <>
              <SecondaryActionButton label="Open snapshot folder" onClick={() => onMockAction("Open snapshot folder bridge stub triggered. No folder was opened.")} />
              <PrimaryActionButton label="Re-run scan" onClick={startRerun} />
            </>
          )
        }
      />
      <SnapshotRerunNotice
        state={rerunState}
        showDetails={showDetails}
        onToggleDetails={() => setShowDetails((shown) => !shown)}
        onRetry={startRerun}
        onChangeSettings={onChangeSettings}
        onDismiss={() => setRerunState("idle")}
        onFinishMock={finishMockRun}
        onFailMock={() => setRerunState("failed")}
      />
      <KpiGrid items={kpis} />
      <div className="card">
        <div className="card-pad between" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="h2">Contents</span>
          <StatusPill status={snapshotUpdated ? "ok" : "warn"} label={snapshotUpdated ? "Updated just now" : "Completed with warnings"} dot />
        </div>
        <SnapshotContent icon="📱" label="App configurations & forms" value={snapshotUpdated ? "13 apps" : "12 apps"} />
        <SnapshotContent icon="🧩" label="Plugin inventory & saved config" value={snapshotUpdated ? "6 plugins" : "5 plugins"} />
        <SnapshotContent icon="📄" label={<>Customization JS / CSS files <span className="small muted2">· order preserved</span></>} value={snapshotUpdated ? "34 files" : "31 files"} />
        <SnapshotContent icon="👥" label="Users, groups, departments & spaces" value="included" />
        <SnapshotContent icon="🔗" label="Dependency & preview-vs-live diff data" value="included" />
      </div>
      <div className="card card-pad between">
        <div className="rowc">
          <StatusPill status="ok" label="Integrity OK" dot />
          <span className="small muted">{snapshotUpdated ? "Manifest verified · captured just now" : "Manifest verified · captured Jul 2, 2026 · 10:35"}</span>
        </div>
        <span className="mono small muted2">snapshot/manifest.json</span>
      </div>
    </div>
  );
}

function SnapshotTitleMeta({ state }: { state: SnapshotRerunState }) {
  if (state === "running") {
    return <StatusPill status="run" label="Running" dot />;
  }

  if (state === "succeeded") {
    return <StatusPill status="ok" label="Updated" dot />;
  }

  if (state === "failed") {
    return <StatusPill status="err" label="Re-run failed" dot />;
  }

  if (state === "canceled") {
    return <StatusPill status="idle" label="Canceled" dot />;
  }

  return null;
}

function SnapshotRerunNotice({
  state,
  showDetails,
  onToggleDetails,
  onRetry,
  onChangeSettings,
  onDismiss,
  onFinishMock,
  onFailMock,
}: {
  state: SnapshotRerunState;
  showDetails: boolean;
  onToggleDetails: () => void;
  onRetry: () => void;
  onChangeSettings: () => void;
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
        <div className="progress" aria-label="Re-run scan progress">
          <i style={{ width: "62%" }} />
        </div>
        <div className="small muted2">Current snapshot remains active until this run completes.</div>
        {showDetails ? (
          <div className="snapshot-rerun__details">
            {collectorRows.map((row) => (
              <div className="snapshot-rerun__row" key={row.label}>
                <StatusPill status={row.tone} label={row.status} dot />
                <span className="body">{row.label}</span>
              </div>
            ))}
            <div className="snapshot-rerun__mock-actions">
              <SecondaryActionButton label="Finish mock run" size="sm" onClick={onFinishMock} />
              <SecondaryActionButton label="Fail mock run" size="sm" variant="ghost" onClick={onFailMock} />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (state === "succeeded") {
    return (
      <div className="snapshot-status-line snapshot-status-line--ok">
        <div className="rowc">
          <StatusPill status="ok" label="Updated" dot />
          <span className="small muted">Latest snapshot updated just now.</span>
        </div>
        <SecondaryActionButton label="Dismiss" size="sm" variant="ghost" onClick={onDismiss} />
      </div>
    );
  }

  const failed = state === "failed";
  return (
    <div className={`snapshot-status-line ${failed ? "snapshot-status-line--err" : "snapshot-status-line--idle"}`}>
      <div className="rowc">
        <StatusPill status={failed ? "err" : "idle"} label={failed ? "Failed" : "Canceled"} dot />
        <span className="small muted">{failed ? "Re-run failed. Current snapshot was not replaced." : "Re-run canceled. Current snapshot was not replaced."}</span>
      </div>
      <div className="rowc">
        <SecondaryActionButton label="Retry" size="sm" onClick={onRetry} />
        {failed ? <SecondaryActionButton label="Change settings" size="sm" variant="ghost" onClick={onChangeSettings} /> : null}
        <SecondaryActionButton label="Dismiss" size="sm" variant="ghost" onClick={onDismiss} />
      </div>
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
