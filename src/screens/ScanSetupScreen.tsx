import { useMemo } from "react";
import { PrimaryActionButton, ScanPresetCard, SecondaryActionButton } from "../components";
import { presets } from "../mockData";
import type { MockActionHandler, ScanPreset, SiteWorkspaceModel } from "../types";
import { PageHeader, ScanAppSelectionNotice } from "./shared";

interface ScanSetupScreenProps {
  site: SiteWorkspaceModel;
  canStartScan: boolean;
  canUseStepScan: boolean;
  selectedPresetId: ScanPreset["id"];
  onPresetChange: (presetId: ScanPreset["id"]) => void;
  onAdvanced: (presetId: ScanPreset["id"]) => void;
  onStart: (presetId: ScanPreset["id"]) => void;
  onStartStep: (presetId: ScanPreset["id"]) => void;
  onChooseApps: () => void;
  onMockAction: MockActionHandler;
}

export function ScanSetupScreen({ site, canStartScan, canUseStepScan, selectedPresetId, onPresetChange, onAdvanced, onStart, onStartStep, onChooseApps, onMockAction }: ScanSetupScreenProps) {
  const presetCards = useMemo(() => presets.map((preset) => ({ ...preset, selected: preset.id === selectedPresetId })), [selectedPresetId]);
  const selectedPreset = presetCards.find((preset) => preset.id === selectedPresetId);

  function handleReviewStart() {
    if (!canStartScan) {
      onMockAction("Choose at least one app before starting a scan.", { tone: "warn" });
      return;
    }

    if (selectedPreset?.opensConfig) {
      onAdvanced(selectedPresetId);
      return;
    }

    onStart(selectedPresetId);
  }

  function handleStepStart() {
    if (!canStartScan) {
      onMockAction("Choose at least one app before starting a step scan.", { tone: "warn" });
      return;
    }

    onStartStep(selectedPresetId);
  }

  function handleAdvancedOptions(presetId = selectedPresetId) {
    onPresetChange(presetId);
    onAdvanced(presetId);
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
          <ScanPresetCard key={preset.id} preset={preset} onSelect={onPresetChange} onConfigure={handleAdvancedOptions} />
        ))}
      </div>
      <div className="between">
        <div>
          <SecondaryActionButton label="▾ Configure selected preset" variant="ghost" onClick={() => handleAdvancedOptions()} />
          <div className="small muted2" style={{ marginTop: 4 }}>
            Each preset keeps its own category configuration.
          </div>
        </div>
        <div className="rowc">
          <span className="small muted2">Baseline, recommended, and sensitive categories are configurable</span>
          {canUseStepScan ? <SecondaryActionButton label="Step scan" disabled={!canStartScan} onClick={handleStepStart} /> : null}
          <PrimaryActionButton label={selectedPreset?.opensConfig ? "Configure & review →" : "Review & start →"} disabled={!canStartScan} onClick={handleReviewStart} />
        </div>
      </div>
    </div>
  );
}
