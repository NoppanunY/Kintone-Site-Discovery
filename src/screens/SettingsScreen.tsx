import { useState } from "react";
import { PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";

const subnav = ["General", "Authentication", "Scan defaults", "Output folder", "Privacy & redaction"];

const initialSettings = {
  preset: "standard",
  recommendedDefaults: true,
  pluginAssets: false,
  sampleRecords: false,
  fullRecordExport: false,
};

export function SettingsScreen() {
  const [settings, setSettings] = useState(initialSettings);
  const [savedSettings, setSavedSettings] = useState(initialSettings);
  const dirty = Object.entries(settings).some(([key, value]) => savedSettings[key as keyof typeof savedSettings] !== value);

  function updateSetting<Key extends keyof typeof settings>(key: Key, value: (typeof settings)[Key]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function resetSettings() {
    setSettings(savedSettings);
  }

  function saveSettings() {
    setSavedSettings(settings);
  }

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
          <select className="select" value={settings.preset} onChange={(event) => updateSetting("preset", event.target.value)}>
            <option value="quick">Quick Scan</option>
            <option value="standard">Standard Scan</option>
            <option value="full">Full Discovery</option>
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
              className={`toggle ${settings.fullRecordExport ? "on" : ""}`}
              role="switch"
              aria-checked={settings.fullRecordExport}
              aria-label="Full record export"
              onClick={() => updateSetting("fullRecordExport", !settings.fullRecordExport)}
            />
            <div className="grow">
              <div className="h3">Full record export</div>
            </div>
            <span className="small muted2">{settings.fullRecordExport ? "On for new scans" : "Off by default"}</span>
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
          <span className="small muted2">{dirty ? "Unsaved local mock changes" : "No unsaved changes"}</span>
          <div className="rowc">
            <SecondaryActionButton label="Cancel" variant="ghost" disabled={!dirty} onClick={resetSettings} />
            <PrimaryActionButton label="Save changes" disabled={!dirty} onClick={saveSettings} />
          </div>
        </div>
      </div>
    </div>
  );
}
