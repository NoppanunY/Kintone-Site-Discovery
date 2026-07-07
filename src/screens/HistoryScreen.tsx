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
      <PageHeader breadcrumb="Client A Production · History" title="Scan history" subtitle="Each run and what it produced. The latest successful run is the current snapshot." />
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
              label={run.status === "Failed" ? "View reason" : "Reports"}
              size="sm"
              onClick={() => {
                if (run.status === "Failed") {
                  onMockAction(`Mock failure reason opened for ${run.title}.`);
                  return;
                }
                onReports();
              }}
            />
            {run.status !== "Failed" ? <SecondaryActionButton label="Files" size="sm" variant="ghost" onClick={onDeveloperFiles} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
