import { useMemo, useState } from "react";
import { PrimaryActionButton, ScanPresetCard, SecondaryActionButton } from "../components";
import { presets } from "../mockData";
import type { MockActionHandler, ScanPreset, SiteWorkspaceModel } from "../types";
import { PageHeader } from "./shared";

interface ScanSetupScreenProps {
  site: SiteWorkspaceModel;
  onAdvanced: () => void;
  onStart: () => void;
  onMockAction: MockActionHandler;
}

export function ScanSetupScreen({ site, onAdvanced, onStart, onMockAction }: ScanSetupScreenProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<ScanPreset["id"]>("standard");
  const presetCards = useMemo(() => presets.map((preset) => ({ ...preset, selected: preset.id === selectedPresetId })), [selectedPresetId]);
  const selectedPreset = presetCards.find((preset) => preset.id === selectedPresetId);

  function handleReviewStart() {
    if (selectedPresetId === "full") {
      onAdvanced();
      return;
    }

    onStart();
  }

  function handleAdvancedOptions() {
    if (selectedPresetId !== "full") {
      setSelectedPresetId("full");
      onMockAction("Advanced options are for Full Discovery. Switching to Full Discovery configuration.");
    }
    onAdvanced();
  }

  return (
    <div className="page">
      <PageHeader
        breadcrumb={`${site.name} · Scan`}
        title="Choose a scan preset"
        subtitle={`${site.selectedApps} apps selected · app list fetched 2 hours ago`}
        actions={<SecondaryActionButton label="⟳ Reload app list" size="sm" onClick={() => onMockAction("Sample app list reloaded. No kintone request was sent.")} />}
      />
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
          <PrimaryActionButton label={selectedPreset?.opensConfig ? "Configure & review →" : "Review & start →"} onClick={handleReviewStart} />
        </div>
      </div>
    </div>
  );
}
