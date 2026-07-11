import { Fragment, useEffect, useState } from "react";
import { SecondaryActionButton, StatusPill } from "../components";
import type { ScanRun } from "@kintone-site-discovery/core";
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
  fixtureOnly?: boolean;
};
type HistoryArtifactKind = "reports" | "files" | "reason";
type SelectedHistoryArtifact = {
  kind: HistoryArtifactKind;
  run: HistoryRun;
};

export function HistoryScreen({
  site,
  onMockAction,
  onLoadHistory,
}: {
  site: SiteWorkspaceModel;
  onMockAction: MockActionHandler;
  onLoadHistory?: () => Promise<ScanRun[]>;
}) {
  const [selectedArtifact, setSelectedArtifact] = useState<SelectedHistoryArtifact | null>(null);
  const [persistedRuns, setPersistedRuns] = useState<ScanRun[] | null>(null);
  const runs = persistedRuns ? persistedRuns.map(historyRunFromScanRun) : historyRunsForSite(site);

  useEffect(() => {
    if (!onLoadHistory) {
      return;
    }

    let cancelled = false;
    void onLoadHistory().then((loadedRuns) => {
      if (!cancelled) {
        setPersistedRuns(loadedRuns);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [onLoadHistory]);

  const openArtifact = (run: HistoryRun, kind: HistoryArtifactKind) => {
    setSelectedArtifact((current) => (current?.run.snapshotId === run.snapshotId && current.kind === kind ? null : { run, kind }));
  };

  return (
    <div className="page">
      <PageHeader
        breadcrumb={`${site.name} · History`}
        title="Scan history"
        subtitle={persistedRuns ? "Fixture scan runs persisted in project history. Snapshot artifacts start in a later phase." : "Mock history rows for projects without persisted scan history yet."}
      />
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
          <span className="body">{run.status === "Failed" ? "A required collector failed before a snapshot was written. This run never became the current snapshot." : "This run never became the current snapshot."}</span>
        </div>
      </div>
    );
  }

  const isReports = kind === "reports";
  if (run.fixtureOnly) {
    return (
      <div className="history-artifact__content">
        <div className="history-artifact__head">
          <div>
            <div className="h3">No snapshot artifacts yet</div>
            <div className="small muted2">
              {run.snapshotId} · fixture run history only
            </div>
          </div>
          <SecondaryActionButton label="Close" size="sm" variant="ghost" onClick={onClose} />
        </div>
        <div className="history-artifact__message">
          <StatusPill status="info" label="N8 fixture" dot />
          <span className="body">This run saved history metadata only. Reports and Developer Files are intentionally disabled until snapshot output is implemented.</span>
        </div>
      </div>
    );
  }

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

function historyRunFromScanRun(run: ScanRun): HistoryRun {
  const result = run.result;
  const status = run.status === "completed" ? "Completed" : run.status === "completed_with_warnings" ? "Completed with warnings" : run.status === "running" ? "Running" : "Failed";
  const tone: StatusTone = run.status === "completed" ? "ok" : run.status === "completed_with_warnings" ? "warn" : run.status === "running" ? "run" : "err";
  return {
    title: formatHistoryDate(run.finishedAt ?? run.startedAt),
    snapshotId: run.snapshotId ?? run.id,
    meta: result
      ? `${result.appsCaptured} apps · Required ${result.requiredOk}/${result.requiredTotal} ok · Optional ${result.optionalSkipped} skipped · Warnings ${result.warningCount} · ${result.redaction.totalRedactions} redactions`
      : `${run.selectedAppIds.length} apps · running`,
    status,
    tone,
    current: false,
    fixtureOnly: !run.snapshotId,
  };
}

function formatHistoryDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
