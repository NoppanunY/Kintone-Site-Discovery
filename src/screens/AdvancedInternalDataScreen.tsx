import { SecondaryActionButton, WarningBanner } from "../components";
import { PageHeader } from "./shared";

export function AdvancedInternalDataScreen() {
  return (
    <div className="page page--narrow">
      <PageHeader breadcrumb="Client A Production · Advanced Internal Data" title="Advanced Internal Data" />
      <WarningBanner tone="danger">
        <strong>This folder is machine-managed. Do not edit files manually.</strong> The .kintone/ folder holds raw and internal data the app maintains for debugging only.
      </WarningBanner>
      <div className="card">
        <div className="card-pad">
          <h2 className="h2">What's inside</h2>
        </div>
        <div className="list">
          {[
            ["Raw snapshots", "312 files"],
            ["Normalized JSON", "288 files"],
            ["Collector results", "69 entries"],
            ["Logs", "4 files"],
          ].map(([label, count]) => (
            <div className="li between" key={label}>
              <span className="body">{label}</span>
              <span className="small muted2 mono">{count}</span>
            </div>
          ))}
        </div>
      </div>
      <label className="rowc">
        <span className="checkbox" />
        <span className="body">I understand this folder is machine-managed and should not be edited manually.</span>
      </label>
      <div className="rowc">
        <SecondaryActionButton label="Open .kintone folder" disabled />
        <span className="small muted2">Enabled after you acknowledge above</span>
      </div>
    </div>
  );
}
