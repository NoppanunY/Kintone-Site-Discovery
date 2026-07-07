import { PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import { PageHeader } from "./shared";

interface AppsScreenProps {
  onContinue: () => void;
}

const appRows = [
  { name: "Sales Management", meta: "ID 101 · Space: CRM · has plugins · has customization", checked: true, status: "In snapshot", tone: "ok" as const },
  { name: "Support Tickets", meta: "ID 102 · Space: CRM · has plugins", checked: true, status: "Not captured", tone: "idle" as const },
  { name: "Contacts", meta: "ID 103 · Guest space · has customization", checked: false, status: "Not captured", tone: "idle" as const },
  { name: "Invoices", meta: "ID 104 · Space: Finance", checked: true, status: "Last scan: warning", tone: "warn" as const },
  { name: "Projects Tracker", meta: "ID 108 · Space: Delivery · has customization", checked: true, status: "Not captured", tone: "idle" as const },
];

export function AppsScreen({ onContinue }: AppsScreenProps) {
  return (
    <div className="page">
      <PageHeader
        breadcrumb="Client A Production · Apps"
        title="Apps"
        subtitle="18 apps · 4 selected · app list fetched 2 hours ago"
        actions={
          <>
            <SecondaryActionButton label="⟳ Reload list" size="sm" />
            <PrimaryActionButton label="Continue to scan →" onClick={onContinue} />
          </>
        }
      />
      <div className="rowc" style={{ gap: 10 }}>
        <div className="input ph" style={{ flex: "1 1 0%" }}>
          <span>🔍 Search apps by name, ID or space…</span>
        </div>
        <div className="select" style={{ width: 150 }}>
          Space: All ▾
        </div>
        <SecondaryActionButton label="Select all" size="sm" />
        <SecondaryActionButton label="Clear" size="sm" variant="ghost" />
      </div>
      <div className="list">
        {appRows.map((app) => (
          <div className="li" key={app.name}>
            <span className={`checkbox ${app.checked ? "checked" : ""}`}>{app.checked ? "✓" : ""}</span>
            <div className="grow">
              <div className="h3">{app.name}</div>
              <div className="small muted2">{app.meta}</div>
            </div>
            <StatusPill status={app.tone} label={app.status} dot />
          </div>
        ))}
      </div>
      <div className="between">
        <span className="small muted">4 of 18 selected</span>
        <span className="small muted2">Sorted by App ID</span>
      </div>
    </div>
  );
}
