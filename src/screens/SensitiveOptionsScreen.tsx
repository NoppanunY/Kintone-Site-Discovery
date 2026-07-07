import { useState } from "react";
import { PrimaryActionButton, SecondaryActionButton, SensitiveOptionRow } from "../components";
import { additionalOptions, recommendedOptions, requiredOptions } from "../mockData";
import type { SiteWorkspaceModel } from "../types";
import { PageHeader } from "./shared";

interface SensitiveOptionsScreenProps {
  site: SiteWorkspaceModel;
  compact?: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

export function SensitiveOptionsScreen({ site, compact = false, onBack, onConfirm }: SensitiveOptionsScreenProps) {
  const [recommended, setRecommended] = useState(recommendedOptions);
  const [additional, setAdditional] = useState(additionalOptions);
  const visibleAdditional = compact ? additional.slice(0, 2) : additional;
  const enabledRecommendedCount = recommended.filter((option) => option.value).length;
  const enabledAdditionalCount = additional.filter((option) => option.value).length;

  function toggleRecommended(key: string) {
    setRecommended((options) => options.map((option) => (option.key === key ? { ...option, value: !option.value } : option)));
  }

  function toggleAdditional(key: string) {
    setAdditional((options) => options.map((option) => (option.key === key ? { ...option, value: !option.value } : option)));
  }

  return (
    <div className="page">
      <PageHeader
        breadcrumb={`${site.name} · Scan · Advanced`}
        title="Configure sensitive options"
        subtitle={`Full Discovery · ${site.selectedApps} apps`}
        actions={<SecondaryActionButton label="▴ Hide" size="sm" variant="ghost" onClick={onBack} />}
      />
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
          <PrimaryActionButton label="Confirm & start →" onClick={onConfirm} />
        </div>
      </div>
    </div>
  );
}
