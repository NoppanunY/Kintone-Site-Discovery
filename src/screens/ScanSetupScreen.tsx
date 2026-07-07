import { useMemo, useState } from "react";
import { PrimaryActionButton, ScanPresetCard, SecondaryActionButton, WarningBanner } from "../components";
import { presets } from "../mockData";
import type { ScanPreset } from "../types";
import { PageHeader } from "./shared";

interface ScanSetupScreenProps {
  onAdvanced: () => void;
  onStart: () => void;
}

export function ScanSetupScreen({ onAdvanced, onStart }: ScanSetupScreenProps) {
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

  return (
    <div className="page">
      <PageHeader
        breadcrumb="Client A Production · Scan"
        title="Choose a scan preset"
        subtitle="4 apps selected · app list fetched 2 hours ago"
        actions={<SecondaryActionButton label="⟳ Reload app list" size="sm" />}
      />
      <WarningBanner tone="info" icon="🔒">
        Every preset is read-only and always includes the 17 required categories. No site data is changed.
      </WarningBanner>
      <div className="preset-grid" role="radiogroup" aria-label="Scan preset">
        {presetCards.map((preset) => (
          <ScanPresetCard key={preset.id} preset={preset} onSelect={setSelectedPresetId} onConfigure={onAdvanced} />
        ))}
      </div>
      <div className="between">
        <SecondaryActionButton label="▾ Show advanced options" variant="ghost" onClick={onAdvanced} />
        <div className="rowc">
          <span className="small muted2">17 required categories · always on 🔒</span>
          <PrimaryActionButton label={selectedPreset?.opensConfig ? "Configure & review →" : "Review & start →"} onClick={handleReviewStart} />
        </div>
      </div>
    </div>
  );
}
