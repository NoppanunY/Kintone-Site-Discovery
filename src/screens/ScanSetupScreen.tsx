import { useMemo, useState } from "react";
import { PrimaryActionButton, ScanPresetCard, SecondaryActionButton } from "../components";
import { presets } from "../mockData";
import type { MockActionHandler, ScanPreset, SiteWorkspaceModel } from "../types";
import { PageHeader, ScanAppSelectionNotice } from "./shared";

interface ScanSetupScreenProps {
  site: SiteWorkspaceModel;
  canStartScan: boolean;
  onAdvanced: () => void;
  onStart: () => void;
  onChooseApps: () => void;
  onMockAction: MockActionHandler;
}

export function ScanSetupScreen({ site, canStartScan, onAdvanced, onStart, onChooseApps, onMockAction }: ScanSetupScreenProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<ScanPreset["id"]>("standard");
  const presetCards = useMemo(() => presets.map((preset) => ({ ...preset, selected: preset.id === selectedPresetId })), [selectedPresetId]);
  const selectedPreset = presetCards.find((preset) => preset.id === selectedPresetId);

  function handleReviewStart() {
    if (!canStartScan) {
      onMockAction("Choose at least one app before starting a scan.", { tone: "warn" });
      return;
    }

    if (selectedPresetId === "full_discovery") {
      onAdvanced();
      return;
    }

    onStart();
  }

  function handleAdvancedOptions() {
    if (selectedPresetId !== "full_discovery") {
      setSelectedPresetId("full_discovery");
      onMockAction("Advanced options are for Full Discovery. Switching to Full Discovery configuration.");
    }
    onAdvanced();
  }

  return (
    <div className="page">
      <PageHeader
        breadcrumb={`${site.name} · Scan`}
        title="Choose a scan preset"
        subtitle={canStartScan ? `${site.selectedApps} apps selected · app list fetched 2 hours ago` : "No apps selected yet · setup can be reviewed, but scan start is locked"}
      />
      {!canStartScan ? <ScanAppSelectionNotice onChooseApps={onChooseApps} /> : null}
      <div className="preset-grid" role="radiogroup" aria-label="Scan preset">
        {presetCards.map((preset) => (
          <ScanPresetCard key={preset.id} preset={preset} onSelect={setSelectedPresetId} onConfigure={handleAdvancedOptions} />
        ))}
      </div>
      <div className="between">
        <div>
          <SecondaryActionButton label="▾ Show advanced options" variant="ghost" onClick={handleAdvancedOptions} />
          <div className="small muted2" style={{ marginTop: 4 }}>
            Advanced options apply to Full Discovery only.
          </div>
        </div>
        <div className="rowc">
          <span className="small muted2">17 required categories · always on 🔒</span>
          <PrimaryActionButton label={selectedPreset?.opensConfig ? "Configure & review →" : "Review & start →"} disabled={!canStartScan} onClick={handleReviewStart} />
        </div>
      </div>
    </div>
  );
}
