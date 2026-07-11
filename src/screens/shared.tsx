import type { KpiModel } from "../types";
import type { SensitiveOption } from "../types";
import type { ReactNode } from "react";
import { ConfirmationModal, SecondaryActionButton, WarningBanner } from "../components";

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

export function SensitiveScanConfirmationModal({
  canStartScan,
  armedOptions,
  onCancel,
  onConfirm,
}: {
  canStartScan: boolean;
  armedOptions: SensitiveOption[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-overlay metadata-modal-overlay">
      <ConfirmationModal
        title="Confirm sensitive capture"
        body={
          canStartScan
            ? "This scan will capture data that may include proprietary code or personal information. It stays local and redacted."
            : "Sensitive options can be reviewed now, but choose at least one app before starting the scan."
        }
        items={armedOptions.map((option) => option.label)}
        requireAck
        ackLabel="I understand these outputs may contain sensitive data."
        confirmLabel="Confirm & start scan"
        cancelLabel="Cancel"
        tone="warn"
        confirmDisabled={!canStartScan}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </div>
  );
}
