import type { KpiModel } from "../types";
import type { ReactNode } from "react";
import { SecondaryActionButton, WarningBanner } from "../components";

export function PageHeader({
  breadcrumb,
  title,
  subtitle,
  actions,
  titleMeta,
}: {
  breadcrumb: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  titleMeta?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <div className="breadcrumb">{breadcrumb}</div>
        <h1 className="h-display">
          {title}{" "}
          {titleMeta ? <span className="title-meta">{titleMeta}</span> : null}
        </h1>
        {subtitle ? <p className="body muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="rowc">{actions}</div> : null}
    </div>
  );
}

export function KpiGrid({ items, columns = 4 }: { items: KpiModel[]; columns?: number }) {
  return (
    <div className="kpi-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {items.map((item) => (
        <div className="kpi" key={item.label}>
          <div className="n">{item.number}</div>
          <div className="l">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

export function ScanAppSelectionNotice({ onChooseApps }: { onChooseApps: () => void }) {
  return (
    <WarningBanner tone="warn">
      <div className="between">
        <span>
          <b>No apps selected yet.</b> Choose at least one app before starting or re-running a scan.
        </span>
        <SecondaryActionButton label="Choose apps" size="sm" onClick={onChooseApps} />
      </div>
    </WarningBanner>
  );
}
