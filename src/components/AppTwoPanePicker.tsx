import { useMemo, useState } from "react";
import {
  filterAppsForPicker,
  groupAppsBySpace,
  selectedAppCountsBySpace,
  spaceNameForPicker,
  uniquePickerSpaces,
  type AppSummary,
} from "@kintone-site-discovery/core";
import { SecondaryActionButton } from "./Buttons";
import { StatusPill } from "./StatusPill";

interface AppTwoPanePickerProps {
  apps: AppSummary[];
  selectedAppIds: string[];
  onSelectionChange: (selectedAppIds: string[]) => void;
  compact?: boolean;
}

export function AppTwoPanePicker({ apps, selectedAppIds, onSelectionChange, compact = false }: AppTwoPanePickerProps) {
  const [query, setQuery] = useState("");
  const [spaceFilter, setSpaceFilter] = useState("");
  const selectedIds = useMemo(() => new Set(selectedAppIds), [selectedAppIds]);
  const spaces = useMemo(() => uniquePickerSpaces(apps), [apps]);
  const filteredApps = useMemo(() => filterAppsForPicker(apps, { query, spaceName: spaceFilter }), [apps, query, spaceFilter]);
  const groupedApps = useMemo(() => groupAppsBySpace(filteredApps), [filteredApps]);
  const selectedApps = useMemo(() => apps.filter((app) => selectedIds.has(app.id)).sort((a, b) => a.kintoneAppId - b.kintoneAppId), [apps, selectedIds]);
  const selectedCounts = useMemo(() => selectedAppCountsBySpace(apps, selectedAppIds), [apps, selectedAppIds]);
  const visibleSelectedCount = filteredApps.filter((app) => selectedIds.has(app.id)).length;
  const allVisibleSelected = filteredApps.length > 0 && visibleSelectedCount === filteredApps.length;

  function applySelection(nextIds: Set<string>) {
    onSelectionChange(Array.from(nextIds));
  }

  function toggleApp(appId: string) {
    const next = new Set(selectedIds);
    if (next.has(appId)) {
      next.delete(appId);
    } else {
      next.add(appId);
    }
    applySelection(next);
  }

  function selectVisibleApps() {
    const next = new Set(selectedIds);
    filteredApps.forEach((app) => next.add(app.id));
    applySelection(next);
  }

  function clearVisibleApps() {
    const next = new Set(selectedIds);
    filteredApps.forEach((app) => next.delete(app.id));
    applySelection(next);
  }

  function removeApp(appId: string) {
    const next = new Set(selectedIds);
    next.delete(appId);
    applySelection(next);
  }

  if (compact) {
    const selectedPreviewApps = selectedApps.slice(0, 8);
    const hiddenSelectedCount = Math.max(0, selectedApps.length - selectedPreviewApps.length);

    return (
      <div className="compact-app-picker">
        <div className="compact-picker-head">
          <div>
            <div className="h3">Sample app list</div>
            <div className="small muted2">
              {apps.length} apps across {spaces.length} Spaces · {selectedApps.length} selected
            </div>
          </div>
          <SecondaryActionButton label="Clear all" size="sm" variant="ghost" disabled={selectedApps.length === 0} onClick={() => onSelectionChange([])} />
        </div>
        <div className="compact-picker-controls">
          <input className="input" value={query} placeholder="Search app name or ID..." onChange={(event) => setQuery(event.target.value)} />
          <SecondaryActionButton label="Select visible" size="sm" onClick={selectVisibleApps} disabled={filteredApps.length === 0 || allVisibleSelected} />
          <SecondaryActionButton label="Clear visible" size="sm" variant="ghost" onClick={clearVisibleApps} disabled={visibleSelectedCount === 0} />
        </div>
        <div className="compact-space-grid" aria-label="Filter apps by space">
          <button type="button" className={`compact-space-chip ${spaceFilter === "" ? "active" : ""}`} onClick={() => setSpaceFilter("")}>
            <span>All</span>
            <b>{apps.length}</b>
          </button>
          {spaces.map((space) => {
            const count = apps.filter((app) => spaceNameForPicker(app) === space).length;
            const selectedInSpace = selectedCounts[space] ?? 0;
            return (
              <button type="button" key={space} className={`compact-space-chip ${spaceFilter === space ? "active" : ""}`} onClick={() => setSpaceFilter(space)}>
                <span>{space}</span>
                <b>
                  {selectedInSpace}/{count}
                </b>
              </button>
            );
          })}
        </div>
        <div className="compact-app-list">
          {filteredApps.map((app) => {
            const selected = selectedIds.has(app.id);
            return (
              <button type="button" className={`compact-app-row ${selected ? "selected" : ""}`} key={app.id} onClick={() => toggleApp(app.id)} aria-pressed={selected}>
                <span className={`checkbox ${selected ? "checked" : ""}`} aria-hidden="true">
                  {selected ? "✓" : ""}
                </span>
                <span className="grow">
                  <span className="h3">{app.name}</span>
                  <span className="small muted2">
                    ID {app.kintoneAppId} · {spaceNameForPicker(app)} · {app.hasPlugins ? "plugins" : "no plugins"} · {app.hasCustomization ? "customization" : "no customization"}
                  </span>
                </span>
                <StatusPill status={statusTone(app.captureStatus)} label={statusLabel(app.captureStatus)} dot />
              </button>
            );
          })}
          {filteredApps.length === 0 ? (
            <div className="picker-empty">
              <div className="h3">No apps match this filter</div>
              <div className="small muted2">Try another search term or Space.</div>
            </div>
          ) : null}
        </div>
        <div className="compact-selected-bar">
          <div className="compact-selected-title">
            <b>{selectedApps.length} selected</b>
            <span className="small muted2">No kintone request is sent in this preview.</span>
          </div>
          <div className="compact-selected-chips">
            {selectedPreviewApps.map((app) => (
              <button type="button" className="selected-app-chip" key={app.id} onClick={() => removeApp(app.id)} title={`Remove ${app.name}`}>
                <span>{app.name}</span>
                <b>×</b>
              </button>
            ))}
            {hiddenSelectedCount > 0 ? <span className="selected-app-chip selected-app-chip--more">+{hiddenSelectedCount} more</span> : null}
            {selectedApps.length === 0 ? <span className="small muted2">Select apps from the list above.</span> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`two-pane-picker ${compact ? "two-pane-picker--compact" : ""}`}>
      <div className="picker-pane picker-pane--left">
        <div className="picker-toolbar">
          <input className="input" value={query} placeholder="Search apps, ID, Space, plugins..." onChange={(event) => setQuery(event.target.value)} />
          <div className="btn-row">
            <SecondaryActionButton label="Select visible" size="sm" onClick={selectVisibleApps} disabled={filteredApps.length === 0 || allVisibleSelected} />
            <SecondaryActionButton label="Clear visible" size="sm" variant="ghost" onClick={clearVisibleApps} disabled={visibleSelectedCount === 0} />
          </div>
        </div>
        <div className="space-filter-list" aria-label="Filter apps by space">
          <button type="button" className={`space-filter ${spaceFilter === "" ? "active" : ""}`} onClick={() => setSpaceFilter("")}>
            <span>All Spaces</span>
            <b>{apps.length}</b>
          </button>
          {spaces.map((space) => (
            <button type="button" key={space} className={`space-filter ${spaceFilter === space ? "active" : ""}`} onClick={() => setSpaceFilter(space)}>
              <span>{space}</span>
              <b>{apps.filter((app) => spaceNameForPicker(app) === space).length}</b>
            </button>
          ))}
        </div>
        <div className="picker-app-list">
          {groupedApps.map((group) => (
            <section className="picker-group" key={group.spaceName}>
              <div className="picker-group__head">
                <span>{group.spaceName}</span>
                <span className="muted2">{group.apps.length} apps</span>
              </div>
              {group.apps.map((app) => {
                const selected = selectedIds.has(app.id);
                return (
                  <button type="button" className={`picker-app-row ${selected ? "selected" : ""}`} key={app.id} onClick={() => toggleApp(app.id)} aria-pressed={selected}>
                    <span className={`checkbox ${selected ? "checked" : ""}`} aria-hidden="true">
                      {selected ? "✓" : ""}
                    </span>
                    <span className="grow">
                      <span className="h3">{app.name}</span>
                      <span className="small muted2">
                        ID {app.kintoneAppId} · {app.hasPlugins ? "plugins" : "no plugins"} · {app.hasCustomization ? "customization" : "no customization"}
                      </span>
                    </span>
                    <StatusPill status={statusTone(app.captureStatus)} label={statusLabel(app.captureStatus)} dot />
                  </button>
                );
              })}
            </section>
          ))}
          {filteredApps.length === 0 ? (
            <div className="picker-empty">
              <div className="h3">No apps match this filter</div>
              <div className="small muted2">Try another search term or Space.</div>
            </div>
          ) : null}
        </div>
      </div>
      <aside className="picker-pane picker-pane--right" aria-label="Selected apps">
        <div className="picker-summary-head">
          <div>
            <div className="h3">{selectedApps.length} selected</div>
            <div className="small muted2">Sample app list only. No kintone request is sent.</div>
          </div>
          <SecondaryActionButton label="Clear all" size="sm" variant="ghost" disabled={selectedApps.length === 0} onClick={() => onSelectionChange([])} />
        </div>
        <div className="selected-space-counts">
          {Object.entries(selectedCounts).map(([space, count]) => (
            <span className="selected-space-count" key={space}>
              {space}: {count}
            </span>
          ))}
          {selectedApps.length === 0 ? <span className="selected-space-count">No apps selected</span> : null}
        </div>
        <div className="selected-app-list">
          {selectedApps.map((app) => (
            <div className="selected-app-row" key={app.id}>
              <div className="grow">
                <div className="h3">{app.name}</div>
                <div className="small muted2">
                  ID {app.kintoneAppId} · {spaceNameForPicker(app)}
                </div>
              </div>
              <button type="button" className="icon-link-button" aria-label={`Remove ${app.name}`} title={`Remove ${app.name}`} onClick={() => removeApp(app.id)}>
                ×
              </button>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function statusLabel(status: AppSummary["captureStatus"]) {
  if (status === "in_snapshot") {
    return "In snapshot";
  }
  if (status === "last_scan_warning") {
    return "Last warning";
  }
  return "Not captured";
}

function statusTone(status: AppSummary["captureStatus"]) {
  if (status === "in_snapshot") {
    return "ok";
  }
  if (status === "last_scan_warning") {
    return "warn";
  }
  return "idle";
}
