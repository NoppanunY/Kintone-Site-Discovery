import { PrimaryActionButton, ScanPresetCard, SecondaryActionButton, WarningBanner } from "../components";
import { presets } from "../mockData";
import { PageHeader } from "./shared";

interface ScanSetupScreenProps {
  onAdvanced: () => void;
  onStart: () => void;
}

export function ScanSetupScreen({ onAdvanced, onStart }: ScanSetupScreenProps) {
  return (
    <div className="page">
      <PageHeader
        breadcrumb="Client A Production · Scan"
        title="Choose a scan preset"
        subtitle="4 apps selected · app list fetched 2 hours ago"
        actions={<SecondaryActionButton label="Reload app list" icon="⟳" />}
      />
      <WarningBanner tone="info">Every preset is read-only and always includes the 17 required categories. Nothing changes in kintone.</WarningBanner>
      <div className="preset-grid" role="radiogroup" aria-label="Scan presets">
        {presets.map((preset) => (
          <ScanPresetCard key={preset.id} preset={preset} onSelect={() => undefined} onConfigure={onAdvanced} />
        ))}
      </div>
      <div className="between">
        <div className="rowc">
          <SecondaryActionButton label="Show advanced options" icon="▾" variant="ghost" onClick={onAdvanced} />
          <span className="small muted2">17 required · always on 🔒</span>
        </div>
        <PrimaryActionButton label="Review & start →" onClick={onStart} />
      </div>
    </div>
  );
}
