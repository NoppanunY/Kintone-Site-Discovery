import type { KpiModel } from "../types";
import type { ReactNode } from "react";

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
