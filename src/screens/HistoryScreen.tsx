import { SecondaryActionButton, StatusPill } from "../components";
import { historyRuns } from "../mockData";
import type { MockActionHandler } from "../types";
import { PageHeader } from "./shared";

interface HistoryScreenProps {
  onReports: () => void;
  onDeveloperFiles: () => void;
  onMockAction: MockActionHandler;
}

export function HistoryScreen({ onReports, onDeveloperFiles, onMockAction }: HistoryScreenProps) {
  return (
    <div className="page">
      <PageHeader breadcrumb="Client A Production · History" title="Scan history" subtitle="Past scan runs for this site. The latest successful run is the current local snapshot." />
      <div className="list">
        {historyRuns.map((run) => (
          <div className="li" key={run.title}>
            <div className="grow">
              <div className="h3">
                {run.title} {run.current ? <span style={{ marginLeft: 6 }}><StatusPill status="info" label="Current snapshot" /></span> : null}
              </div>
              <div className="small muted2">{run.meta}</div>
            </div>
            <StatusPill status={run.tone} label={run.status} dot />
            <SecondaryActionButton
              label={run.status === "Failed" ? "Show failure reason" : "Open reports"}
              size="sm"
              onClick={() => {
                if (run.status === "Failed") {
                  onMockAction(`Failure reason for ${run.title}: sign-in rejected. No log file was opened.`);
                  return;
                }
                onMockAction(`Opening reports for the ${run.title} scan. This mock uses the current Reports screen.`);
                onReports();
              }}
            />
            {run.status !== "Failed" ? (
              <SecondaryActionButton
                label="Open developer files"
                size="sm"
                variant="ghost"
                onClick={() => {
                  onMockAction(`Opening developer files for the ${run.title} scan. This mock uses the current Developer Files screen.`);
                  onDeveloperFiles();
                }}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
