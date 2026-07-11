import { useState } from "react";
import { PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import type { MockActionHandler, SiteWorkspaceModel } from "../types";
import type { KintoneScanErrorMode } from "@kintone-site-discovery/core";

const subnav = ["General", "Authentication", "Scan defaults", "Output folder", "Privacy & redaction"] as const;
type SettingsSection = (typeof subnav)[number];

const initialSettings = {
  preset: "standard",
  recommendedDefaults: true,
  pluginAssets: false,
  sampleRecords: false,
  fullRecordCapture: false,
};

export function SettingsScreen({
  site,
  scanErrorMode,
  onScanErrorModeChange,
  onMockAction,
}: {
  site: SiteWorkspaceModel;
  scanErrorMode: KintoneScanErrorMode;
  onScanErrorModeChange: (errorMode: KintoneScanErrorMode) => void;
  onMockAction: MockActionHandler;
}) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("Scan defaults");
  const [settings, setSettings] = useState(initialSettings);
  const [savedSettings, setSavedSettings] = useState(initialSettings);
  const dirty = Object.entries(settings).some(([key, value]) => savedSettings[key as keyof typeof savedSettings] !== value);
  const pauseOnError = scanErrorMode === "pause_on_error";

  function updateSetting<Key extends keyof typeof settings>(key: Key, value: (typeof settings)[Key]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function resetSettings() {
    setSettings(savedSettings);
  }

  function saveSettings() {
    setSavedSettings(settings);
    onMockAction("Scan default settings saved in preview state only. No config file was written.");
  }

  function togglePauseOnError() {
    const nextMode: KintoneScanErrorMode = pauseOnError ? "continue_on_error" : "pause_on_error";
    onScanErrorModeChange(nextMode);
    onMockAction(nextMode === "pause_on_error" ? "Scan runs will pause when an API error is found." : "Scan runs will continue after API errors.");
  }

  return (
    <div className="page" style={{ flexDirection: "row", gap: 22 }}>
      <div style={{ width: 180, flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 2 }}>
        {subnav.map((item) => (
          <button
            type="button"
            key={item}
            className={`nav-item ${item === activeSection ? "active" : ""}`}
            aria-current={item === activeSection ? "page" : undefined}
            onClick={() => {
              setActiveSection(item);
              if (item !== "Scan defaults") {
                onMockAction(`${item} settings section opened. Its controls are not connected yet.`);
              }
            }}
          >
            <span className={`body ${item === activeSection ? "strong" : ""}`}>{item}</span>
          </button>
        ))}
      </div>
      <div className="grow" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div className="breadcrumb">Settings</div>
          <h1 className="h-display">{activeSection}</h1>
          <div className="small muted2" style={{ marginTop: 4 }}>
            {site.name} · {site.domain}
          </div>
        </div>
        {activeSection === "Scan defaults" ? (
          <>
            <div className="form-group" style={{ maxWidth: 320 }}>
              <span className="label">Default scan preset</span>
              <select className="select" value={settings.preset} onChange={(event) => updateSetting("preset", event.target.value)}>
                <option value="quick">Quick Scan</option>
                <option value="standard">Standard Scan</option>
                <option value="full_discovery">Full Discovery</option>
              </select>
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
                <button
                  type="button"
                  className={`toggle ${pauseOnError ? "on" : ""}`}
                  role="switch"
                  aria-checked={pauseOnError}
                  aria-label="Pause on API error"
                  onClick={togglePauseOnError}
                />
                <div className="grow">
                  <div className="h3">Pause on API error</div>
                  <div className="small muted2">Stop the scan so a developer can inspect the failed request.</div>
                </div>
                <StatusPill status={pauseOnError ? "warn" : "idle"} label={pauseOnError ? "Pause" : "Continue"} />
              </div>
              <div className="li">
                <button
                  type="button"
                  className={`toggle ${settings.recommendedDefaults ? "on" : ""}`}
                  role="switch"
                  aria-checked={settings.recommendedDefaults}
                  aria-label="Recommended defaults"
                  onClick={() => updateSetting("recommendedDefaults", !settings.recommendedDefaults)}
                />
                <div className="grow">
                  <div className="h3">Recommended defaults</div>
                </div>
                <StatusPill status={settings.recommendedDefaults ? "ok" : "idle"} label={settings.recommendedDefaults ? "On" : "Off"} />
              </div>
              <div className="li">
                <button
                  type="button"
                  className={`toggle ${settings.pluginAssets ? "on" : ""}`}
                  role="switch"
                  aria-checked={settings.pluginAssets}
                  aria-label="Plugin assets"
                  onClick={() => updateSetting("pluginAssets", !settings.pluginAssets)}
                />
                <div className="grow">
                  <div className="h3">Plugin assets</div>
                </div>
                <span className="small muted2">{settings.pluginAssets ? "On for new scans" : "Off by default"}</span>
              </div>
              <div className="li">
                <button
                  type="button"
                  className={`toggle ${settings.sampleRecords ? "on" : ""}`}
                  role="switch"
                  aria-checked={settings.sampleRecords}
                  aria-label="Sample records"
                  onClick={() => updateSetting("sampleRecords", !settings.sampleRecords)}
                />
                <div className="grow">
                  <div className="h3">Sample records</div>
                </div>
                <span className="small muted2">{settings.sampleRecords ? "On · max 25" : "Off by default · max 25 when enabled"}</span>
              </div>
              <div className="li">
                <button
                  type="button"
                  className={`toggle ${settings.fullRecordCapture ? "on" : ""}`}
                  role="switch"
                  aria-checked={settings.fullRecordCapture}
                  aria-label="Full record capture"
                  onClick={() => updateSetting("fullRecordCapture", !settings.fullRecordCapture)}
                />
                <div className="grow">
                  <div className="h3">Full record capture</div>
                </div>
                <span className="small muted2">{settings.fullRecordCapture ? "On for new scans" : "Off by default"}</span>
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
              <span className="small muted2">{dirty ? "Unsaved preview changes" : "No unsaved changes"}</span>
              <div className="rowc">
                <SecondaryActionButton label="Cancel" variant="ghost" disabled={!dirty} onClick={resetSettings} />
                <PrimaryActionButton label="Save changes" disabled={!dirty} onClick={saveSettings} />
              </div>
            </div>
          </>
        ) : (
          <div className="card card-pad">
            <div className="h3">{activeSection} settings</div>
            <div className="body muted" style={{ marginTop: 6 }}>
              This section is available for navigation now. Its controls will be connected in a later settings pass.
            </div>
            <div className="rowc" style={{ marginTop: 14 }}>
              <SecondaryActionButton label="Back to Scan defaults" onClick={() => setActiveSection("Scan defaults")} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
