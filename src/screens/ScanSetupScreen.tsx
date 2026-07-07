import { PrimaryActionButton, SecondaryActionButton, StatusPill, WarningBanner } from "../components";
import { PageHeader } from "./shared";

interface ScanSetupScreenProps {
  onAdvanced: () => void;
  onStart: () => void;
}

export function ScanSetupScreen({ onAdvanced, onStart }: ScanSetupScreenProps) {
  return (
    <div className="page">
      <PageHeader
        breadcrumb="Client A Production · Scan"
        title="Choose a scan preset"
        subtitle="4 apps selected · app list fetched 2 hours ago"
        actions={<SecondaryActionButton label="⟳ Reload app list" size="sm" />}
      />
      <WarningBanner tone="info" icon="🔒">
        Every preset is read-only and always includes the 17 required categories. No site data is changed.
      </WarningBanner>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="card card-pad between" style={{ cursor: "pointer" }}>
          <div className="rowc">
            <span className="checkbox" />
            <div>
              <div className="h3">Quick Scan</div>
              <div className="small muted2">Structure only — apps, fields, views, permissions, plugin inventory. Fastest.</div>
            </div>
          </div>
          <StatusPill status="idle" label="Required only" />
        </div>
        <div className="card card-pad between" style={{ border: "2px solid var(--primary)", background: "var(--primary-tint)" }}>
          <div className="rowc">
            <span className="checkbox checked">✓</span>
            <div>
              <div className="h3">
                Standard Scan{" "}
                <span className="pill pill--info" style={{ marginLeft: 6 }}>
                  Recommended
                </span>
              </div>
              <div className="small muted" style={{ color: "var(--primary-600)" }}>
                Quick + users &amp; groups, spaces, JS/CSS files, plugin saved config, dependency &amp; preview-vs-live diff.
              </div>
            </div>
          </div>
        </div>
        <div className="card card-pad between" style={{ cursor: "pointer" }}>
          <div className="rowc">
            <span className="checkbox" />
            <div>
              <div className="h3">Full Discovery</div>
              <div className="small muted2">
                Standard + opt-in captures. Opens <b>Configure sensitive options</b> — nothing sensitive turns on until you configure and confirm.
              </div>
            </div>
          </div>
          <SecondaryActionButton label="Configure ›" size="sm" onClick={onAdvanced} />
        </div>
      </div>
      <div className="between">
        <SecondaryActionButton label="▾ Show advanced options" variant="ghost" onClick={onAdvanced} />
        <div className="rowc">
          <span className="small muted2">17 required categories · always on 🔒</span>
          <PrimaryActionButton label="Review & start →" onClick={onStart} />
        </div>
      </div>
    </div>
  );
}
