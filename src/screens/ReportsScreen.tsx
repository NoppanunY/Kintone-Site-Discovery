import { PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import type { MockActionHandler, SiteWorkspaceModel } from "../types";
import { PageHeader } from "./shared";

const reports = [
  ["Site summary", "Overview of the site, apps and health"],
  ["Apps summary", "Per-app fields, views and configuration"],
  ["Plugins summary", "Installed plugins and captured configuration"],
  ["Dependency report", "Detected links between apps, plugins and files"],
];

export function ReportsScreen({ site, onMockAction, onRevealFolder }: { site: SiteWorkspaceModel; onMockAction: MockActionHandler; onRevealFolder: () => void }) {
  return (
    <div className="page">
      <PageHeader
        breadcrumb={`${site.name} · Reports`}
        title="Reports"
        subtitle="Mock report list for this N5 build. Real report generation is not implemented yet."
        actions={site.hasSnapshot ? <SecondaryActionButton label="Reveal reports folder" onClick={onRevealFolder} /> : undefined}
      />
      {!site.hasSnapshot ? (
        <div className="card card-pad">
          <div className="h3">No reports yet</div>
          <div className="body muted" style={{ marginTop: 6 }}>
            No real reports have been generated yet. Run screens are preview-only in this build.
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
