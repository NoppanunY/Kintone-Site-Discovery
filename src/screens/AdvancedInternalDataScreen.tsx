import { useState } from "react";
import { SecondaryActionButton, WarningBanner } from "../components";
import type { SiteWorkspaceModel } from "../types";

export function AdvancedInternalDataScreen({ site, onOpenInternalFolder }: { site: SiteWorkspaceModel; onOpenInternalFolder: () => void }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [openRequested, setOpenRequested] = useState(false);

  return (
    <div className="page advanced-gate-page">
      <div>
        <div className="breadcrumb">{site.name} · Advanced Internal Data</div>
        <h1 className="h-display" style={{ color: "var(--text-2)" }}>
          Advanced Internal Data
        </h1>
      </div>
      <WarningBanner tone="danger">
        <b>This folder is machine-managed. Do not edit files manually.</b> The <span className="mono">.kintone/</span> folder holds raw and internal data the app maintains for
        debugging only. You don't need it for normal use, and editing it can corrupt the snapshot.
      </WarningBanner>
      <div className="card">
        <div className="card-pad" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="h3">What's inside</span>
        </div>
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
      <div className="rowc" style={{ gap: 10 }}>
        <button
          type="button"
          className={`checkbox ${acknowledged ? "checked" : ""}`}
          aria-pressed={acknowledged}
          aria-label="Acknowledge machine-managed folder warning"
          onClick={() => {
            setAcknowledged((value) => !value);
            setOpenRequested(false);
          }}
        >
          {acknowledged ? "✓" : ""}
        </button>
        <span className="body">I understand this folder is machine-managed and should not be edited manually.</span>
      </div>
      <div className="rowc">
        <SecondaryActionButton
          label="Open .kintone folder"
          disabled={!acknowledged}
          onClick={() => {
            setOpenRequested(true);
            onOpenInternalFolder();
          }}
        />
        <span className="small muted2">
          {openRequested ? "Open request sent through the desktop bridge" : acknowledged ? "Ready to open through the desktop bridge" : "Enabled after you acknowledge above"}
        </span>
      </div>
    </div>
  );
}
