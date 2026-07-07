import type { ReactNode } from "react";
import { PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import { PageHeader } from "./shared";

interface SensitiveOptionsScreenProps {
  compact?: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

export function SensitiveOptionsScreen({ compact = false, onBack, onConfirm }: SensitiveOptionsScreenProps) {
  return (
    <div className="page">
      <PageHeader
        breadcrumb="Client A Production · Scan · Advanced"
        title="Configure sensitive options"
        subtitle="Full Discovery · 4 apps"
        actions={<SecondaryActionButton label="▴ Hide" size="sm" variant="ghost" onClick={onBack} />}
      />
      {compact ? null : (
        <>
          <div className="card">
            <div className="card-pad between" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="rowc">
                <span className="pill pill--info">Required</span>
                <span className="h3">Always captured</span>
              </div>
              <span className="small muted2">17 categories</span>
            </div>
            <div className="li">
              <span className="checkbox locked">🔒</span>
              <div className="grow small muted">
                App settings · form fields &amp; layout · views · process · permissions · notifications · plugin inventory · customization metadata · live + preview…
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-pad" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="rowc">
                <span className="pill pill--ok">Recommended</span>
                <span className="h3">On in Standard</span>
              </div>
            </div>
            {["Users, groups & departments", "Spaces & members", "App customization JS / CSS files", "Plugin saved config", "Dependency detection · preview-vs-live diff"].map((label) => (
              <div className="li" key={label}>
                <span className="toggle on" />
                <div className="grow">
                  <div className="h3">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="card">
        <div className="card-pad" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="rowc">
            <span className="pill pill--warn">Additional · sensitive</span>
            <span className="h3">Off by default</span>
          </div>
        </div>
        <SensitiveRow on label="Plugin desktop / config assets (JS/CSS/HTML)" />
        <SensitiveRow on label={<span>Sample records <span className="small muted2">· redacted · max 25</span></span>} />
        {compact ? null : (
          <>
            <SensitiveRow label="Record comments · attachment metadata" />
            <SensitiveRow label="Full record export · browser screenshots" />
          </>
        )}
      </div>
      <div className="between">
        <SecondaryActionButton label="← Back to presets" onClick={onBack} />
        <PrimaryActionButton label="Confirm & start →" onClick={onConfirm} />
      </div>
    </div>
  );
}

function SensitiveRow({ label, on = false }: { label: ReactNode; on?: boolean }) {
  return (
    <div className="li">
      <span className={`toggle ${on ? "on" : ""}`} />
      <div className="grow">
        <div className="h3">{label}</div>
      </div>
      <StatusPill status="warn" label="Sensitive" dot />
    </div>
  );
}
