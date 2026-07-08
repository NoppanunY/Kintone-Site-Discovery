import { PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import type { MockActionHandler, SiteWorkspaceModel } from "../types";
import { PageHeader } from "./shared";

export function DeveloperFilesScreen({ site, onMockAction, onRevealFolder }: { site: SiteWorkspaceModel; onMockAction: MockActionHandler; onRevealFolder: () => void }) {
  return (
    <div className="page">
      <PageHeader
        breadcrumb={`${site.name} · Developer Files`}
        title="Developer Files"
        titleMeta={<StatusPill status="idle" label="Advanced" />}
        subtitle="Mock developer-file list for this N5 build. Real file generation is not implemented yet."
        actions={site.hasSnapshot ?
          <>
            <SecondaryActionButton label="Reveal files folder" onClick={onRevealFolder} />
            <PrimaryActionButton
              label="Create review package"
              onClick={() => onMockAction("Review package would include manifest.json, reports, developer files, redaction log, and README. No zip file was written.")}
            />
          </>
        : undefined}
      />
      {!site.hasSnapshot ? (
        <div className="card card-pad">
          <div className="h3">No developer files yet</div>
          <div className="body muted" style={{ marginTop: 6 }}>
            No real developer files have been generated yet. Run screens are preview-only in this build.
          </div>
        </div>
      ) : (
        <>
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
          <SecondaryActionButton label="Open file" size="sm" onClick={() => onMockAction("Would open structured-data.jsonl in the OS-default app. No file was opened.")} />
        </div>
        <div className="li">
          <span className="mono small" style={{ width: 22 }}>
            {"{ }"}
          </span>
          <div className="grow">
            <div className="h3 mono">manifest.json</div>
            <div className="small muted2">Index of everything in this snapshot · 18 KB</div>
          </div>
          <SecondaryActionButton label="Open file" size="sm" onClick={() => onMockAction("Would open manifest.json in the OS-default app. No file was opened.")} />
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
        </>
      )}
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
