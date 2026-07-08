import { useState } from "react";
import { PrimaryActionButton, SecondaryActionButton, SensitiveOptionRow } from "../components";
import { recommendedOptions, requiredOptions } from "../mockData";
import type { SensitiveOption, SiteWorkspaceModel } from "../types";
import { PageHeader, ScanAppSelectionNotice } from "./shared";

interface SensitiveOptionsScreenProps {
  site: SiteWorkspaceModel;
  compact?: boolean;
  canStartScan: boolean;
  additionalOptions: SensitiveOption[];
  onAdditionalOptionsChange: (options: SensitiveOption[]) => void;
  onBack: () => void;
  onChooseApps: () => void;
  onConfirm: () => void;
}

export function SensitiveOptionsScreen({ site, compact = false, canStartScan, additionalOptions, onAdditionalOptionsChange, onBack, onChooseApps, onConfirm }: SensitiveOptionsScreenProps) {
  const [recommended, setRecommended] = useState(recommendedOptions);
  const visibleAdditional = compact ? additionalOptions.filter((option) => option.value) : additionalOptions;
  const enabledRecommendedCount = recommended.filter((option) => option.value).length;
  const enabledAdditionalCount = additionalOptions.filter((option) => option.value).length;

  function toggleRecommended(key: string) {
    setRecommended((options) => options.map((option) => (option.key === key ? { ...option, value: !option.value } : option)));
  }

  function toggleAdditional(key: string) {
    onAdditionalOptionsChange(additionalOptions.map((option) => (option.key === key ? { ...option, value: !option.value } : option)));
  }

  return (
    <div className="page">
      <PageHeader
        breadcrumb={`${site.name} · Scan · Advanced`}
        title="Configure sensitive options"
        subtitle={canStartScan ? `Full Discovery · ${site.selectedApps} apps` : "Full Discovery · no apps selected yet"}
        actions={<SecondaryActionButton label="▴ Hide" size="sm" variant="ghost" onClick={onBack} />}
      />
      {!canStartScan && !compact ? <ScanAppSelectionNotice onChooseApps={onChooseApps} /> : null}
      {compact ? null : (
        <>
          <div className="card">
            <div className="card-pad between" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="rowc">
                <span className="pill pill--info">Required</span>
                <span className="h3">Always captured</span>
              </div>
              <span className="small muted2">17 categories</span>
            </div>
            {requiredOptions.map((option) => (
              <SensitiveOptionRow key={option.key} option={option} />
            ))}
          </div>
          <div className="card">
            <div className="card-pad" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="rowc">
                <span className="pill pill--ok">Recommended</span>
                <span className="h3">On in Standard</span>
              </div>
            </div>
            {recommended.map((option) => (
              <SensitiveOptionRow key={option.key} option={option} onChange={toggleRecommended} />
            ))}
          </div>
        </>
      )}
      <div className="card">
        <div className="card-pad" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="rowc">
            <span className="pill pill--warn">Additional · sensitive</span>
            <span className="h3">Off by default</span>
          </div>
        </div>
        {visibleAdditional.length === 0 && compact ? (
          <div className="option-row">
            <div className="grow">
              <div className="h3">No sensitive options are on</div>
              <div className="small muted2">This confirmation route is only used when sensitive capture is armed.</div>
            </div>
          </div>
        ) : null}
        {visibleAdditional.map((option) => (
          <SensitiveOptionRow key={option.key} option={option} onChange={toggleAdditional} />
        ))}
      </div>
      <div className="between">
        <SecondaryActionButton label="← Back to presets" onClick={onBack} />
        <div className="rowc">
          <span className="small muted2">
            {enabledRecommendedCount} recommended on · {enabledAdditionalCount} sensitive on
          </span>
          <PrimaryActionButton label="Confirm & start →" disabled={!canStartScan} onClick={onConfirm} />
        </div>
      </div>
    </div>
  );
}
