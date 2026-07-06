import { PrimaryActionButton, SecondaryActionButton, StatusPill, WarningBanner } from "../components";
import { KpiGrid, PageHeader } from "./shared";

export function LocalSnapshotScreen({ onRunScan }: { onRunScan: () => void }) {
  return (
    <div className="page">
      <PageHeader
        breadcrumb="Client A Production · Local Snapshot"
        title="Local Snapshot"
        subtitle="Captured Jul 2, 2026 · 10:35 · 48.2 MB · ~/KintoneDiscovery/client-a/snapshot"
        actions={
          <>
            <SecondaryActionButton label="Reveal folder" />
            <PrimaryActionButton label="◎ Re-run scan" onClick={onRunScan} />
          </>
        }
      />
      <WarningBanner tone="info">The snapshot is the canonical record of this pull. Reports and Developer Files are generated from it.</WarningBanner>
      <KpiGrid
        items={[
          { number: "48.2", label: "MB" },
          { number: "12", label: "Apps" },
          { number: "5", label: "Plugins" },
          { number: "4", label: "Redactions" },
        ]}
      />
      <div className="list">
        {["apps", "plugins", "customization files · order preserved", "org", "dependencies"].map((item) => (
          <div className="li between" key={item}>
            <span className="body">{item}</span>
            <span className="mono muted2">ready</span>
          </div>
        ))}
      </div>
      <div className="card card-pad between">
        <div>
          <h2 className="h2">Integrity OK</h2>
          <p className="body muted">manifest verified · file-order metadata present</p>
        </div>
        <StatusPill status="ok" label="Integrity OK" dot />
      </div>
    </div>
  );
}
