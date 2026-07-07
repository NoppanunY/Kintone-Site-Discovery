import type { ScanPreset } from "../types";
import { SecondaryActionButton } from "./Buttons";
import { StatusPill } from "./StatusPill";

interface ScanPresetCardProps {
  preset: ScanPreset;
  onSelect: (id: ScanPreset["id"]) => void;
  onConfigure?: () => void;
}

export function ScanPresetCard({ preset, onSelect, onConfigure }: ScanPresetCardProps) {
  const selected = Boolean(preset.selected);
  return (
    <div
      className={`preset-card ${selected ? "preset-card--selected" : ""}`}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={() => onSelect(preset.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(preset.id);
        }
      }}
    >
      <div className="between">
        <h3 className="h3">{preset.title}</h3>
        {selected ? <span className="checkbox checkbox--checked">✓</span> : <span className="checkbox" />}
      </div>
      <p className="body muted">{preset.description}</p>
      <div className="between">
        {preset.badge ? <StatusPill status={preset.id === "quick" ? "idle" : "info"} label={preset.badge} /> : <span />}
        {preset.opensConfig ? (
          <SecondaryActionButton
            label="Configure ›"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              onConfigure?.();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
