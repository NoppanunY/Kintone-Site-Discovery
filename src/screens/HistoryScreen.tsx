import { Fragment, useState } from "react";
import { SecondaryActionButton, StatusPill } from "../components";
import { historyRunsForSite } from "../mockData";
import type { MockActionHandler, SiteWorkspaceModel, StatusTone } from "../types";
import { PageHeader } from "./shared";

type HistoryRun = {
  title: string;
  snapshotId: string;
  meta: string;
  status: string;
  tone: StatusTone;
  current?: boolean;
};
type HistoryArtifactKind = "reports" | "files" | "reason";
type SelectedHistoryArtifact = {
  kind: HistoryArtifactKind;
  run: HistoryRun;
};

export function HistoryScreen({ site, onMockAction }: { site: SiteWorkspaceModel; onMockAction: MockActionHandler }) {
  const [selectedArtifact, setSelectedArtifact] = useState<SelectedHistoryArtifact | null>(null);
  const runs = historyRunsForSite(site);

  const openArtifact = (run: HistoryRun, kind: HistoryArtifactKind) => {
    setSelectedArtifact((current) => (current?.run.snapshotId === run.snapshotId && current.kind === kind ? null : { run, kind }));
  };

  return (
    <div className="page">
      <PageHeader breadcrumb={`${site.name} · History`} title="Scan history" subtitle="Past scan runs for this site. The latest successful run is the current local snapshot." />
      <div className="list">
        {runs.map((run) => {
          const selectedForRun = selectedArtifact?.run.snapshotId === run.snapshotId ? selectedArtifact : null;
          return (
            <Fragment key={run.snapshotId}>
              <div className="li">
                <div className="grow">
                  <div className="h3">
                    {run.title} {run.current ? <span style={{ marginLeft: 6 }}><StatusPill status="info" label="Current snapshot" /></span> : null}
                  </div>
                  <div className="small muted2">{run.meta}</div>
                  <div className="mono small muted2">{run.snapshotId}</div>
                </div>
                <StatusPill status={run.tone} label={run.status} dot />
                <SecondaryActionButton
                  label={run.status === "Failed" ? "Show failure reason" : "Open snapshot reports"}
                  size="sm"
                  onClick={() => openArtifact(run, run.status === "Failed" ? "reason" : "reports")}
                />
                {run.status !== "Failed" ? (
                  <SecondaryActionButton label="Open snapshot files" size="sm" variant="ghost" onClick={() => openArtifact(run, "files")} />
                ) : null}
              </div>
              {selectedForRun ? (
                <div className="li li--panel history-artifact">
                  <HistoryArtifactPanel selection={selectedForRun} onClose={() => setSelectedArtifact(null)} onMockAction={onMockAction} />
                </div>
              ) : null}
            </Fragment>
          );
        })}
        {runs.length === 0 ? (
          <div className="li">
            <div className="grow">
              <div className="h3">No scan history yet</div>
              <div className="small muted2">Run a scan to create the first history entry for {site.name}.</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HistoryArtifactPanel({
  selection,
  onClose,
  onMockAction,
}: {
  selection: SelectedHistoryArtifact;
  onClose: () => void;
  onMockAction: MockActionHandler;
}) {
  const { run, kind } = selection;
  const snapshotLabel = run.current ? "current local snapshot" : run.status === "Failed" ? "failed run summary" : "historical snapshot";

  if (kind === "reason") {
    return (
      <div className="history-artifact__content">
        <div className="history-artifact__head">
          <div>
            <div className="h3">Failure reason for {run.title}</div>
            <div className="small muted2">
              {run.snapshotId} · failed run summary
            </div>
          </div>
          <SecondaryActionButton label="Close" size="sm" variant="ghost" onClick={onClose} />
        </div>
        <div className="history-artifact__message">
          <StatusPill status="err" label="Sign-in rejected" dot />
          <span className="body">The auth profile was rejected before the required collectors completed. This run never became the current snapshot.</span>
        </div>
      </div>
    );
  }

  const isReports = kind === "reports";
  const items = isReports ? ["site-summary.md", "apps-summary.md", "plugins-summary.md"] : ["manifest.json", "structured-data.jsonl", "developer-files/customization/001-common.js"];

  return (
    <div className="history-artifact__content">
      <div className="history-artifact__head">
        <div>
          <div className="h3">{isReports ? "Reports" : "Developer files"} from this snapshot</div>
          <div className="small muted2">
            {run.snapshotId} · {snapshotLabel}
          </div>
        </div>
        <SecondaryActionButton label="Close" size="sm" variant="ghost" onClick={onClose} />
      </div>
      <div className="history-artifact__items">
        {items.map((item) => (
          <div className="history-artifact__item" key={item}>
            <span className="mono small grow">{item}</span>
            <SecondaryActionButton
              label={isReports ? "Open report" : "Open file"}
              size="sm"
              onClick={() => onMockAction(`Would open ${item} from ${run.snapshotId}. No file was opened.`)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
