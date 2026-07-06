import { PrimaryActionButton, SecondaryActionButton, SensitiveOptionRow, StatusPill } from "../components";
import { PageHeader } from "./shared";

const defaults = [
  { key: "required", label: "Required categories", tier: "required" as const, value: true, locked: true, meta: "The minimum for a useful snapshot" },
  { key: "recommended", label: "Recommended defaults", tier: "recommended" as const, value: true },
  { key: "plugin-assets", label: "Plugin assets", tier: "additional" as const, value: false, meta: "Off by default" },
  { key: "sample-records", label: "Sample records", tier: "additional" as const, value: false, meta: "Off by default · max 25 when enabled" },
  { key: "full-record", label: "Full record capture", tier: "additional" as const, value: false, meta: "Off by default" },
];

export function SettingsScreen() {
  return (
    <div className="page page--row">
      <nav className="subnav" aria-label="Settings sections">
        {["General", "Authentication", "Scan defaults", "Output folder", "Privacy & redaction"].map((item) => (
          <button type="button" key={item} className="nav-item" aria-current={item === "Scan defaults" ? "page" : undefined}>
            {item}
          </button>
        ))}
      </nav>
      <div className="grow page">
        <PageHeader breadcrumb="Settings" title="Scan defaults" />
        <div className="form-group">
          <span className="label">Default scan preset</span>
          <span className="select">Standard Scan ▾</span>
        </div>
        <section className="card">
          <div className="card-pad">
            <h2 className="h2">Default categories</h2>
          </div>
          <div className="list">
            {defaults.map((option) => (
              <SensitiveOptionRow key={option.key} option={option} />
            ))}
          </div>
        </section>
        <div className="card card-pad rowc">
          <span className="checkbox checkbox--locked">🔒</span>
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
