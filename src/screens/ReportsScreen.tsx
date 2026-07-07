import { PrimaryActionButton, SecondaryActionButton, StatusPill, WarningBanner } from "../components";
import { PageHeader } from "./shared";

const reports = [
  ["Site summary", "Overview of the site, apps and health"],
  ["Apps summary", "Per-app fields, views and configuration"],
  ["Plugins summary", "Installed plugins and captured configuration"],
  ["Dependency report", "Detected links between apps, plugins and files"],
];

export function ReportsScreen() {
  return (
    <div className="page">
      <PageHeader
        breadcrumb="Client A Production · Reports"
        title="Reports"
        subtitle="Generated from the local snapshot captured Jul 2, 10:35. Readable summaries — no code needed."
        actions={<SecondaryActionButton label="Reveal folder" />}
      />
      <div className="list">
        {reports.map(([title, description], index) => (
          <div className="li" key={title}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--r-sm)",
                background: "var(--primary-tint)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ▦
            </div>
            <div className="grow">
              <div className="h3">{title}</div>
              <div className="small muted2">{description}</div>
            </div>
            <StatusPill status="ok" label="Up to date" dot />
            {index === 0 ? <PrimaryActionButton label="Open" size="sm" /> : <SecondaryActionButton label="Open" size="sm" />}
          </div>
        ))}
      </div>
      <WarningBanner tone="info">Reports regenerate automatically from the snapshot. If you re-run a scan, these refresh to match.</WarningBanner>
    </div>
  );
}
