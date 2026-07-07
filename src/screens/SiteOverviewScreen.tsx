import { PrimaryActionButton, SecondaryActionButton, StatusPill, WarningBanner } from "../components";
import { overviewKpis } from "../mockData";
import type { MockActionHandler } from "../types";
import { KpiGrid, PageHeader } from "./shared";

interface SiteOverviewScreenProps {
  onRunScan: () => void;
  onSnapshot: () => void;
  onReports: () => void;
  onDeveloperFiles: () => void;
  onMockAction: MockActionHandler;
}

export function SiteOverviewScreen({ onRunScan, onSnapshot, onReports, onDeveloperFiles, onMockAction }: SiteOverviewScreenProps) {
  return (
    <div className="page">
      <PageHeader
        breadcrumb="Client A Production"
        title="Overview"
        subtitle="client-a.cybozu.com · Client A Admin"
        actions={
          <>
            <StatusPill status="ok" label="Connected" dot />
            <SecondaryActionButton label="Test connection" onClick={() => onMockAction("Mock connection test passed for Client A Production. No kintone request was sent.")} />
            <PrimaryActionButton label="◎ Run scan" onClick={onRunScan} />
          </>
        }
      />
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
          <SecondaryActionButton label="〈〉 Developer files" onClick={onDeveloperFiles} />
          <SecondaryActionButton label="Open folder" variant="ghost" onClick={() => onMockAction("Open folder bridge stub triggered. No Windows Explorer window was opened.")} />
        </div>
      </div>
      <WarningBanner tone="info">
        The snapshot is the canonical record of this pull. Reports and Developer Files are generated from it — re-running a scan replaces the snapshot and regenerates both.
      </WarningBanner>
    </div>
  );
}
