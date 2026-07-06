import { ReportListItem, SecondaryActionButton, WarningBanner } from "../components";
import { reports } from "../mockData";
import { PageHeader } from "./shared";

export function ReportsScreen() {
  return (
    <div className="page">
      <PageHeader
        breadcrumb="Client A Production · Reports"
        title="Reports"
        subtitle="Generated from snapshot captured Jul 2, 2026 · 10:35"
        actions={<SecondaryActionButton label="Reveal folder" />}
      />
      <div className="list">
        {reports.map((report, index) => (
          <ReportListItem key={report.title} item={report} primary={index === 0} />
        ))}
      </div>
      <WarningBanner tone="info">Reports regenerate from the snapshot. Most admins can stay here instead of Developer Files.</WarningBanner>
    </div>
  );
}
