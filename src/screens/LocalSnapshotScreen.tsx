import type { ReactNode } from "react";
import { PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import type { MockActionHandler } from "../types";
import { KpiGrid, PageHeader } from "./shared";

export function LocalSnapshotScreen({ onRunScan, onMockAction }: { onRunScan: () => void; onMockAction: MockActionHandler }) {
  return (
    <div className="page">
      <PageHeader
        breadcrumb="Client A Production · Local Snapshot"
        title="Local Snapshot"
        subtitle="The complete local copy this scan produced — the source for every report and file."
        actions={
          <>
            <SecondaryActionButton label="Open folder" onClick={() => onMockAction("Open snapshot folder bridge stub triggered. No folder was opened.")} />
            <PrimaryActionButton label="◎ Re-run scan" onClick={onRunScan} />
          </>
        }
      />
      <KpiGrid
        items={[
          { number: "48.2", label: "MB on disk" },
          { number: "12", label: "Apps" },
          { number: "5", label: "Plugins" },
          { number: "4", label: "Redactions" },
        ]}
      />
      <div className="card">
        <div className="card-pad between" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="h2">Contents</span>
          <StatusPill status="warn" label="Completed with warnings" dot />
        </div>
        <SnapshotContent icon="📱" label="App configurations & forms" value="12 apps" />
        <SnapshotContent icon="🧩" label="Plugin inventory & saved config" value="5 plugins" />
        <SnapshotContent icon="📄" label={<>Customization JS / CSS files <span className="small muted2">· order preserved</span></>} value="31 files" />
        <SnapshotContent icon="👥" label="Users, groups, departments & spaces" value="included" />
        <SnapshotContent icon="🔗" label="Dependency & preview-vs-live diff data" value="included" />
      </div>
      <div className="card card-pad between">
        <div className="rowc">
          <StatusPill status="ok" label="Integrity OK" dot />
          <span className="small muted">Manifest verified · captured Jul 2, 2026 · 10:35</span>
        </div>
        <span className="mono small muted2">snapshot/manifest.json</span>
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
