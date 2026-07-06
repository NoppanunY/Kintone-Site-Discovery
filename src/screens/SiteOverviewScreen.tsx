import { PrimaryActionButton, SecondaryActionButton, SnapshotCard, StatusPill, WarningBanner } from "../components";
import { overviewKpis } from "../mockData";
import { KpiGrid, PageHeader } from "./shared";

interface SiteOverviewScreenProps {
  onRunScan: () => void;
  onSnapshot: () => void;
  onReports: () => void;
  onDeveloperFiles: () => void;
}

export function SiteOverviewScreen({ onRunScan, onSnapshot, onReports, onDeveloperFiles }: SiteOverviewScreenProps) {
  return (
    <div className="page">
      <PageHeader
        breadcrumb="Client A Production · Overview"
        title="Client A Production"
        subtitle="client-a.cybozu.com · Client A Admin"
        actions={
          <>
            <StatusPill status="ok" label="Connected" dot />
            <SecondaryActionButton label="Test connection" />
            <PrimaryActionButton label="◎ Run scan" onClick={onRunScan} />
          </>
        }
      />
      <KpiGrid items={overviewKpis} />
      <SnapshotCard statusLabel="Completed with warnings" capturedAt="Jul 2, 2026 · 10:35" sizeOnDisk="48.2 MB" folderPath="~/KintoneDiscovery/client-a/snapshot" onOpenSnapshot={onSnapshot} />
      <div className="btn-row">
        <SecondaryActionButton label="View reports" icon="▦" onClick={onReports} />
        <SecondaryActionButton label="Developer files" icon="<>" variant="ghost" onClick={onDeveloperFiles} />
      </div>
      <WarningBanner tone="info">
        The snapshot is the canonical record of this pull. Reports and Developer Files are generated from it.
      </WarningBanner>
    </div>
  );
}
