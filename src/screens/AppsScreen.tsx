import { PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import { apps } from "../mockData";
import { PageHeader } from "./shared";

interface AppsScreenProps {
  onContinue: () => void;
}

export function AppsScreen({ onContinue }: AppsScreenProps) {
  return (
    <div className="page">
      <PageHeader
        breadcrumb="Client A Production · Apps"
        title="Apps"
        subtitle="18 apps · 4 selected · app list fetched 2 hours ago"
        actions={
          <>
            <SecondaryActionButton label="Reload list" />
            <PrimaryActionButton label="Continue to scan →" onClick={onContinue} />
          </>
        }
      />
      <div className="card card-pad">
        <div className="form-grid">
          <div className="form-group">
            <span className="label">Search</span>
            <span className="input input--placeholder">Search apps</span>
          </div>
          <div className="form-group">
            <span className="label">Space filter</span>
            <span className="select">All spaces ▾</span>
          </div>
        </div>
      </div>
      <div className="between">
        <div className="btn-row">
          <SecondaryActionButton label="Select all" size="sm" />
          <SecondaryActionButton label="Clear" size="sm" variant="ghost" />
        </div>
        <span className="small muted2">4 of 18 selected</span>
      </div>
      <div className="list">
        {apps.map((app) => (
          <div className="li" key={app.id}>
            <span className={`checkbox ${app.selected ? "checkbox--checked" : ""}`}>{app.selected ? "✓" : ""}</span>
            <div className="grow">
              <div className="h3">{app.name}</div>
              <div className="small muted2">
                ID {app.id} · {app.space} · {app.facts}
              </div>
            </div>
            <StatusPill status={app.tone} label={app.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
