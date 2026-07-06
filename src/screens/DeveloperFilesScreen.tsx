import { DeveloperFileList, FileOrderList, PrimaryActionButton, SecondaryActionButton, StatusPill, WarningBanner } from "../components";
import { developerFiles, fileOrder } from "../mockData";
import { PageHeader } from "./shared";

export function DeveloperFilesScreen() {
  return (
    <div className="page">
      <PageHeader
        breadcrumb="Client A Production · Developer Files"
        title="Developer Files"
        titleMeta={<StatusPill status="idle" label="Advanced" />}
        subtitle="Structured data generated from the snapshot, for developers and handoff. Most admins can stay in Reports."
        actions={
          <>
            <SecondaryActionButton label="Reveal folder" />
            <PrimaryActionButton label="Create review package" />
          </>
        }
      />
      <DeveloperFileList files={developerFiles} />
      <div className="card">
        <div className="card-pad between card-pad--separated">
          <div>
            <h2 className="h2">Customization files — Sales Management</h2>
            <p className="small muted2">Desktop JavaScript · execution order preserved, not alphabetical</p>
          </div>
          <StatusPill status="info" label="Order from snapshot" dot />
        </div>
        <FileOrderList files={fileOrder} />
      </div>
      <WarningBanner tone="info">File order is stored in the snapshot manifest and shown here verbatim — never re-sorted A–Z.</WarningBanner>
    </div>
  );
}
