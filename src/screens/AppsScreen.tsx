import { useMemo, useState } from "react";
import { PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import type { MockActionHandler } from "../types";
import { PageHeader } from "./shared";

interface AppsScreenProps {
  onContinue: () => void;
  onMockAction: MockActionHandler;
}

const appRows = [
  { id: "101", name: "Sales Management", space: "CRM", facts: "has plugins · has customization", checked: true, status: "In snapshot", tone: "ok" as const },
  { id: "102", name: "Support Tickets", space: "CRM", facts: "has plugins", checked: true, status: "Not captured", tone: "idle" as const },
  { id: "103", name: "Contacts", space: "Guest space", facts: "has customization", checked: false, status: "Not captured", tone: "idle" as const },
  { id: "104", name: "Invoices", space: "Finance", facts: "no customization", checked: true, status: "Last scan: warning", tone: "warn" as const },
  { id: "108", name: "Projects Tracker", space: "Delivery", facts: "has customization", checked: true, status: "Not captured", tone: "idle" as const },
];

export function AppsScreen({ onContinue, onMockAction }: AppsScreenProps) {
  const [query, setQuery] = useState("");
  const [spaceFilter, setSpaceFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(() => new Set(appRows.filter((app) => app.checked).map((app) => app.id)));

  const spaces = useMemo(() => Array.from(new Set(appRows.map((app) => app.space))), []);
  const filteredApps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return appRows.filter((app) => {
      const matchesSpace = spaceFilter === "all" || app.space === spaceFilter;
      const searchTarget = `${app.name} ${app.id} ${app.space} ${app.facts}`.toLowerCase();
      const matchesQuery = normalizedQuery.length === 0 || searchTarget.includes(normalizedQuery);
      return matchesSpace && matchesQuery;
    });
  }, [query, spaceFilter]);
  const selectedCount = selectedIds.size;
  const visibleSelectedCount = filteredApps.filter((app) => selectedIds.has(app.id)).length;
  const allVisibleSelected = filteredApps.length > 0 && visibleSelectedCount === filteredApps.length;

  function toggleApp(appId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  }

  function selectFilteredApps() {
    setSelectedIds((current) => {
      const next = new Set(current);
      filteredApps.forEach((app) => next.add(app.id));
      return next;
    });
  }

  function clearFilteredApps() {
    setSelectedIds((current) => {
      const next = new Set(current);
      filteredApps.forEach((app) => next.delete(app.id));
      return next;
    });
  }

  return (
    <div className="page">
      <PageHeader
        breadcrumb="Client A Production · Apps"
        title="Apps"
        subtitle={`${appRows.length} apps · ${selectedCount} selected · app list fetched 2 hours ago`}
        actions={
          <>
            <SecondaryActionButton label="⟳ Reload list" size="sm" onClick={() => onMockAction("Mock app list reloaded from local seed data. No kintone request was sent.")} />
            <PrimaryActionButton label="Continue to scan →" disabled={selectedCount === 0} onClick={onContinue} />
          </>
        }
      />
      <div className="rowc" style={{ gap: 10 }}>
        <input
          className="input"
          style={{ flex: "1 1 0%" }}
          value={query}
          placeholder="Search apps by name, ID or space..."
          onChange={(event) => setQuery(event.target.value)}
        />
        <select className="select" style={{ width: 170 }} value={spaceFilter} onChange={(event) => setSpaceFilter(event.target.value)}>
          <option value="all">Space: All</option>
          {spaces.map((space) => (
            <option key={space} value={space}>
              {space}
            </option>
          ))}
        </select>
        <SecondaryActionButton label="Select all" size="sm" onClick={selectFilteredApps} disabled={filteredApps.length === 0 || allVisibleSelected} />
        <SecondaryActionButton label="Clear" size="sm" variant="ghost" onClick={clearFilteredApps} disabled={visibleSelectedCount === 0} />
      </div>
      <div className="list">
        {filteredApps.map((app) => {
          const selected = selectedIds.has(app.id);
          return (
            <div className="li" key={app.name}>
              <button
                type="button"
                className={`checkbox ${selected ? "checked" : ""}`}
                aria-pressed={selected}
                aria-label={`Select ${app.name}`}
                onClick={() => toggleApp(app.id)}
              >
                {selected ? "✓" : ""}
              </button>
              <div className="grow">
                <div className="h3">{app.name}</div>
                <div className="small muted2">
                  ID {app.id} · Space: {app.space} · {app.facts}
                </div>
              </div>
              <StatusPill status={app.tone} label={app.status} dot />
            </div>
          );
        })}
        {filteredApps.length === 0 ? (
          <div className="li">
            <div className="grow">
              <div className="h3">No apps match this filter</div>
              <div className="small muted2">Try another search or space.</div>
            </div>
          </div>
        ) : null}
      </div>
      <div className="between">
        <span className="small muted">
          {visibleSelectedCount} of {filteredApps.length} visible selected · {selectedCount} total selected
        </span>
        <span className="small muted2">Sorted by App ID</span>
      </div>
    </div>
  );
}
