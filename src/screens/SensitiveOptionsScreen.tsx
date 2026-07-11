import { PrimaryActionButton, SecondaryActionButton, SensitiveOptionRow } from "../components";
import type { PresetId } from "@kintone-site-discovery/core";
import type { SensitiveOption, SiteWorkspaceModel } from "../types";
import { PageHeader, ScanAppSelectionNotice } from "./shared";

interface SensitiveOptionsScreenProps {
  site: SiteWorkspaceModel;
  presetId: PresetId;
  compact?: boolean;
  canStartScan: boolean;
  baselineOptions: SensitiveOption[];
  onBaselineOptionsChange: (options: SensitiveOption[]) => void;
  recommendedOptions: SensitiveOption[];
  onRecommendedOptionsChange: (options: SensitiveOption[]) => void;
  additionalOptions: SensitiveOption[];
  onAdditionalOptionsChange: (options: SensitiveOption[]) => void;
  onBack: () => void;
  onChooseApps: () => void;
  onConfirm: () => void;
}

export function SensitiveOptionsScreen({
  site,
  presetId,
  compact = false,
  canStartScan,
  baselineOptions,
  onBaselineOptionsChange,
  recommendedOptions,
  onRecommendedOptionsChange,
  additionalOptions,
  onAdditionalOptionsChange,
  onBack,
  onChooseApps,
  onConfirm,
}: SensitiveOptionsScreenProps) {
  const visibleAdditional = compact ? additionalOptions.filter((option) => option.value) : additionalOptions;
  const enabledBaselineCount = baselineOptions.filter((option) => option.value).length;
  const enabledRecommendedCount = recommendedOptions.filter((option) => option.value).length;
  const enabledAdditionalCount = additionalOptions.filter((option) => option.value).length;

  function toggleBaseline(key: string) {
    onBaselineOptionsChange(baselineOptions.map((option) => (option.key === key ? { ...option, value: !option.value } : option)));
  }

  function toggleRecommended(key: string) {
    onRecommendedOptionsChange(recommendedOptions.map((option) => (option.key === key ? { ...option, value: !option.value } : option)));
  }

  function toggleAdditional(key: string) {
    onAdditionalOptionsChange(additionalOptions.map((option) => (option.key === key ? { ...option, value: !option.value } : option)));
  }

  return (
    <div className="page">
      <PageHeader
        breadcrumb={`${site.name} · Scan · Advanced`}
        title="Configure scan categories"
        subtitle={canStartScan ? `${presetLabel(presetId)} · ${site.selectedApps} apps` : `${presetLabel(presetId)} · no apps selected yet`}
        actions={<SecondaryActionButton label="▴ Hide" size="sm" variant="ghost" onClick={onBack} />}
      />
      {!canStartScan && !compact ? <ScanAppSelectionNotice onChooseApps={onChooseApps} /> : null}
      {compact ? null : (
        <>
          <div className="card">
            <div className="card-pad between" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="rowc">
                <span className="pill pill--info">Baseline</span>
                <span className="h3">On by default</span>
              </div>
              <span className="small muted2">{enabledBaselineCount}/{baselineOptions.length} on</span>
            </div>
            {baselineOptions.map((option) => (
              <SensitiveOptionRow key={option.key} option={option} onChange={toggleBaseline} />
            ))}
          </div>
          <div className="card">
            <div className="card-pad" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="rowc">
                <span className="pill pill--ok">Recommended</span>
                <span className="h3">Extended context</span>
              </div>
              <span className="small muted2">{enabledRecommendedCount}/{recommendedOptions.length} on</span>
            </div>
            {recommendedOptions.map((option) => (
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
            {enabledBaselineCount} baseline on · {enabledRecommendedCount} extended on · {enabledAdditionalCount} sensitive on
          </span>
          <PrimaryActionButton label="Confirm & start →" disabled={!canStartScan} onClick={onConfirm} />
        </div>
      </div>
    </div>
  );
}

function presetLabel(presetId: PresetId) {
  if (presetId === "quick") return "Quick Scan";
  if (presetId === "full_discovery") return "Full Discovery";
  return "Standard Scan";
}
