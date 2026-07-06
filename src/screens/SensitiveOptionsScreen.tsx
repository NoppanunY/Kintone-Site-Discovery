import type { ReactNode } from "react";
import { PrimaryActionButton, SecondaryActionButton, SensitiveOptionRow, StatusPill, WarningBanner } from "../components";
import { additionalOptions, recommendedOptions, requiredOptions } from "../mockData";
import { PageHeader } from "./shared";

interface SensitiveOptionsScreenProps {
  onBack: () => void;
  onConfirm: () => void;
}

export function SensitiveOptionsScreen({ onBack, onConfirm }: SensitiveOptionsScreenProps) {
  return (
    <div className="page">
      <PageHeader
        breadcrumb="Client A Production · Scan · Advanced"
        title="Configure sensitive options"
        subtitle="Full Discovery · 4 apps"
        actions={<SecondaryActionButton label="Hide" variant="ghost" onClick={onBack} />}
      />
      <OptionCard title="Required" subtitle="Always captured" pill={<StatusPill status="info" label="17 categories" />}>
        {requiredOptions.map((option) => (
          <SensitiveOptionRow key={option.key} option={option} />
        ))}
      </OptionCard>
      <OptionCard title="Recommended" subtitle="On in Standard">
        {recommendedOptions.map((option) => (
          <SensitiveOptionRow key={option.key} option={option} />
        ))}
      </OptionCard>
      <OptionCard title="Additional · sensitive" subtitle="Off by default">
        {additionalOptions.map((option) => (
          <SensitiveOptionRow key={option.key} option={option} />
        ))}
      </OptionCard>
      <WarningBanner tone="warn">Turning any sensitive option on requires confirmation before the scan runs.</WarningBanner>
      <div className="between">
        <SecondaryActionButton label="← Back to presets" variant="ghost" onClick={onBack} />
        <PrimaryActionButton label="Confirm & start →" onClick={onConfirm} />
      </div>
    </div>
  );
}

function OptionCard({ title, subtitle, pill, children }: { title: string; subtitle: string; pill?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      <div className="card-pad between">
        <div>
          <h2 className="h2">{title}</h2>
          <p className="small muted2">{subtitle}</p>
        </div>
        {pill}
      </div>
      <div className="list">{children}</div>
    </section>
  );
}
