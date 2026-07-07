import { PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import type { MockActionHandler, SiteWorkspaceModel } from "../types";
import { PageHeader } from "./shared";

const reports = [
  ["Site summary", "Overview of the site, apps and health"],
  ["Apps summary", "Per-app fields, views and configuration"],
  ["Plugins summary", "Installed plugins and captured configuration"],
  ["Dependency report", "Detected links between apps, plugins and files"],
];

export function ReportsScreen({ site, onMockAction }: { site: SiteWorkspaceModel; onMockAction: MockActionHandler }) {
  return (
    <div className="page">
      <PageHeader
        breadcrumb={`${site.name} · Reports`}
        title="Reports"
        subtitle="Readable summaries generated from the current local snapshot."
        actions={site.hasSnapshot ? <SecondaryActionButton label="Reveal reports folder" onClick={() => onMockAction("Folder opening is not connected yet. No folder was opened.")} /> : undefined}
      />
      {!site.hasSnapshot ? (
        <div className="card card-pad">
          <div className="h3">No reports yet</div>
          <div className="body muted" style={{ marginTop: 6 }}>
            Run a scan to create the first local snapshot and generate reports for {site.name}.
          </div>
        </div>
      ) : (
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
            {index === 0 ? (
              <PrimaryActionButton label="Open report" size="sm" onClick={() => onMockAction(`Would open the ${title} markdown report in the OS-default app. No report was opened.`)} />
            ) : (
              <SecondaryActionButton label="Open report" size="sm" onClick={() => onMockAction(`Would open the ${title} markdown report in the OS-default app. No report was opened.`)} />
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
