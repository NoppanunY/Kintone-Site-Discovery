import { PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";

const subnav = ["General", "Authentication", "Scan defaults", "Output folder", "Privacy & redaction"];

export function SettingsScreen() {
  return (
    <div className="page" style={{ flexDirection: "row", gap: 22 }}>
      <div style={{ width: 180, flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 2 }}>
        {subnav.map((item) => (
          <div key={item} className={`nav-item ${item === "Scan defaults" ? "active" : ""}`}>
            <span className={`body ${item === "Scan defaults" ? "strong" : ""}`}>{item}</span>
          </div>
        ))}
      </div>
      <div className="grow" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div className="breadcrumb">Settings</div>
          <h1 className="h-display">Scan defaults</h1>
        </div>
        <div className="form-group" style={{ maxWidth: 320 }}>
          <span className="label">Default scan preset</span>
          <div className="select">Standard Scan ▾</div>
        </div>
        <div className="card">
          <div className="card-pad" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="h3">Default categories</span>
          </div>
          <div className="li">
            <span className="checkbox locked">🔒</span>
            <div className="grow">
              <div className="h3">Required categories</div>
              <div className="small muted2">The minimum for a useful snapshot</div>
            </div>
            <StatusPill status="info" label="Always on" />
          </div>
          <div className="li">
            <span className="toggle on" />
            <div className="grow">
              <div className="h3">Recommended defaults</div>
            </div>
            <StatusPill status="ok" label="On" />
          </div>
          <div className="li">
            <span className="toggle" />
            <div className="grow">
              <div className="h3">Plugin assets</div>
            </div>
            <span className="small muted2">Off by default</span>
          </div>
          <div className="li">
            <span className="toggle" />
            <div className="grow">
              <div className="h3">Sample records</div>
            </div>
            <span className="small muted2">Off by default · max 25 when enabled</span>
          </div>
          <div className="li">
            <span className="toggle" />
            <div className="grow">
              <div className="h3">Full record export</div>
            </div>
            <span className="small muted2">Off by default</span>
          </div>
        </div>
        <div className="card card-pad rowc">
          <span className="checkbox locked">🔒</span>
          <div className="grow">
            <div className="h3">Redaction of personal data</div>
            <div className="small muted2">Always on for MVP 1 — cannot be disabled</div>
          </div>
          <StatusPill status="info" label="Locked on" />
        </div>
        <div className="between">
          <span />
          <div className="rowc">
            <SecondaryActionButton label="Cancel" variant="ghost" />
            <PrimaryActionButton label="Save changes" />
          </div>
        </div>
      </div>
    </div>
  );
}
