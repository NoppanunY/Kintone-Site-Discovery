import { PrimaryActionButton, SecondaryActionButton, StatusPill, WarningBanner } from "../components";
import { PageHeader, KpiGrid } from "./shared";

type ResultMode = "completed" | "warnings" | "failed";

interface ScanResultScreenProps {
  mode: ResultMode;
  onReports: () => void;
  onSnapshot: () => void;
  onDeveloperFiles: () => void;
  onRetry: () => void;
}

export function ScanResultScreen({ mode, onReports, onSnapshot, onDeveloperFiles, onRetry }: ScanResultScreenProps) {
  if (mode === "failed") {
    return (
      <div className="page">
        <WarningBanner tone="danger">
          <strong>Failed.</strong> A required part of the data could not be captured. Nothing was written back to kintone.
        </WarningBanner>
        <PageHeader
          breadcrumb="Client A Production · Scan result"
          title="Scan failed"
          actions={<StatusPill status="err" label="Failed" dot />}
        />
        <div className="card card-pad">
          <h2 className="h2">Sign-in was rejected.</h2>
          <p className="body muted">Check the profile password or domain. Partial data is kept for inspection when available.</p>
        </div>
        <div className="btn-row">
          <PrimaryActionButton label="Retry scan" onClick={onRetry} />
          <SecondaryActionButton label="Fix connection" />
          <SecondaryActionButton label="Review partial scan summary" variant="ghost" />
        </div>
      </div>
    );
  }

  const warnings = mode === "warnings";
  return (
    <div className="page">
      <WarningBanner tone={warnings ? "warn" : "ok"}>
        <strong>{warnings ? "Completed with warnings." : "Completed."}</strong>{" "}
        {warnings ? "All required data was captured. Some optional captures were skipped — safe to ignore or retry." : "All required data was captured. The local snapshot is up to date."}
      </WarningBanner>
      <PageHeader
        breadcrumb="Client A Production · Scan result"
        title={warnings ? "Completed with warnings" : "Scan completed"}
        actions={<StatusPill status={warnings ? "warn" : "ok"} label={warnings ? "Completed with warnings" : "Completed"} dot />}
      />
      <KpiGrid
        items={
          warnings
            ? [
                { number: "68/68", label: "Required ok" },
                { number: "1", label: "Optional skipped" },
                { number: "2", label: "Warnings" },
                { number: "4", label: "Redactions" },
              ]
            : [
                { number: "12", label: "Apps" },
                { number: "5", label: "Plugins" },
                { number: "4", label: "Redactions" },
                { number: "69/69", label: "Required ok" },
              ]
        }
      />
      {warnings ? (
        <div className="list">
          <div className="li">
            <div className="grow">
              <div className="h3">Sample records skipped</div>
              <div className="small muted2">Optional capture timed out. Required snapshot data is complete.</div>
            </div>
            <SecondaryActionButton label="Retry item" size="sm" />
          </div>
        </div>
      ) : (
        <div className="card card-pad">
          <h2 className="h2">Required: 69/69 ok</h2>
          <p className="body muted">Reports and Developer Files are generated from the new current snapshot.</p>
        </div>
      )}
      <div className="btn-row">
        <PrimaryActionButton label="View reports" onClick={onReports} />
        <SecondaryActionButton label="Open Local Snapshot" onClick={onSnapshot} />
        <SecondaryActionButton label={warnings ? "Re-run skipped" : "Developer files"} variant="ghost" onClick={warnings ? undefined : onDeveloperFiles} />
      </div>
    </div>
  );
}
