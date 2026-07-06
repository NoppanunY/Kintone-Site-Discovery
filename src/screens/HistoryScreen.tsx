import { SecondaryActionButton, StatusPill } from "../components";
import { historyRuns } from "../mockData";
import { PageHeader } from "./shared";

export function HistoryScreen() {
  return (
    <div className="page">
      <PageHeader breadcrumb="Client A Production · History" title="Scan history" subtitle="Each run and what it produced. The latest successful run is the current snapshot." />
      <div className="list">
        {historyRuns.map((run) => (
          <div className="li" key={run.title}>
            <div className="grow">
              <div className="h3">
                {run.title} {run.current ? <StatusPill status="info" label="Current snapshot" /> : null}
              </div>
              <div className="small muted2">{run.meta}</div>
            </div>
            <StatusPill status={run.tone} label={run.status} dot />
            <SecondaryActionButton label={run.status === "Failed" ? "View reason" : "Reports"} size="sm" />
            {run.status !== "Failed" ? <SecondaryActionButton label="Files" size="sm" variant="ghost" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
