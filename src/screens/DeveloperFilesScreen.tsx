import { PrimaryActionButton, SecondaryActionButton, StatusPill, WarningBanner } from "../components";
import type { MockActionHandler } from "../types";
import { PageHeader } from "./shared";

export function DeveloperFilesScreen({ onMockAction }: { onMockAction: MockActionHandler }) {
  return (
    <div className="page">
      <PageHeader
        breadcrumb="Client A Production · Developer Files"
        title="Developer Files"
        titleMeta={<StatusPill status="idle" label="Advanced" />}
        subtitle="Structured data generated from the snapshot, for developers and handoff. Most admins can stay in Reports."
        actions={
          <>
            <SecondaryActionButton label="Reveal folder" onClick={() => onMockAction("Reveal developer files folder bridge stub triggered. No folder was opened.")} />
            <PrimaryActionButton label="Create review package" onClick={() => onMockAction("Review package creation is a mock stub. No zip file was written.")} />
          </>
        }
      />
      <div className="list">
        <div className="li">
          <span className="mono small" style={{ width: 22 }}>
            {"{ }"}
          </span>
          <div className="grow">
            <div className="h3 mono">structured-data.jsonl</div>
            <div className="small muted2">1,204 records · 2.1 MB</div>
          </div>
          <StatusPill status="ok" label="Redacted" dot />
          <SecondaryActionButton label="Open" size="sm" onClick={() => onMockAction("Opened mock developer file: structured-data.jsonl.")} />
        </div>
        <div className="li">
          <span className="mono small" style={{ width: 22 }}>
            {"{ }"}
          </span>
          <div className="grow">
            <div className="h3 mono">export-manifest.json</div>
            <div className="small muted2">Index of everything in this export · 18 KB</div>
          </div>
          <SecondaryActionButton label="Open" size="sm" onClick={() => onMockAction("Opened mock developer file: export-manifest.json.")} />
        </div>
      </div>
      <div className="card">
        <div className="card-pad between" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <span className="h3">Customization files — Sales Management</span>
            <div className="small muted2" style={{ marginTop: 2 }}>
              Desktop JavaScript · <b>execution order preserved</b>, not alphabetical
            </div>
          </div>
          <StatusPill status="info" label="Order from snapshot" dot />
        </div>
        <div className="forder">
          <FileOrderRow index={1} name="001-common.js" confidence="high · api · confidence: high" />
          <FileOrderRow index={2} name="002-feature.js" confidence="high · api · confidence: high" />
          <FileOrderRow index={3} name="003-finalize.js" confidence="high · api · confidence: medium" />
        </div>
      </div>
      <WarningBanner tone="info">
        File order (orderIndex · orderSource · confidence) is stored in the snapshot manifest and shown here verbatim — never re-sorted A–Z.
      </WarningBanner>
    </div>
  );
}

function FileOrderRow({ index, name, confidence }: { index: number; name: string; confidence: string }) {
  return (
    <div className="fo">
      <span className="idx">{index}</span>
      <span className="grow">{name}</span>
      <span className="muted2">{confidence}</span>
    </div>
  );
}
