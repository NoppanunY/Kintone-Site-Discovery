import { useState } from "react";
import type { ReactNode } from "react";
import { PrimaryActionButton, SecondaryActionButton } from "./Buttons";

interface ConfirmationModalProps {
  title: string;
  body: string;
  items?: string[];
  requireAck?: boolean;
  ackLabel?: string;
  confirmLabel: string;
  cancelLabel: string;
  tertiaryLabel?: string;
  tone: "warn" | "danger";
  confirmDisabled?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onTertiary?: () => void;
}

export function ConfirmationModal({
  title,
  body,
  items = [],
  requireAck = false,
  ackLabel,
  confirmLabel,
  cancelLabel,
  tertiaryLabel,
  tone,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  onTertiary,
}: ConfirmationModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const icon = tone === "danger" ? "✕" : "⚠";

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="card-pad" style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "var(--r-md)",
            background: tone === "danger" ? "var(--danger-tint)" : "var(--warn-tint)",
            color: tone === "danger" ? "var(--danger)" : "var(--warn)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 19,
            flex: "0 0 auto",
          }}
        >
          {icon}
        </div>
        <div>
          <h2 id="confirm-title" className="h1">
            {title}
          </h2>
          <p className="body muted" style={{ marginTop: 4 }}>
            {body}
          </p>
        </div>
      </div>
      {items.length > 0 || requireAck ? (
        <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.length > 0 ? (
            <>
              <span className="cap">Will be captured</span>
              {items.map((item) => (
                <CaptureRow key={item}>{item}</CaptureRow>
              ))}
            </>
          ) : null}
          {requireAck ? (
            <>
              <div className="divider" style={{ margin: "4px 0" }} />
              <label className="rowc" style={{ gap: 10 }}>
                <button
                  type="button"
                  className={`checkbox ${acknowledged ? "checked" : ""}`}
                  aria-pressed={acknowledged}
                  aria-label={ackLabel}
                  onClick={() => setAcknowledged((current) => !current)}
                >
                  {acknowledged ? "✓" : ""}
                </button>
                <span className="body">{ackLabel}</span>
              </label>
            </>
          ) : null}
        </div>
      ) : null}
      <div className="card-pad between" style={{ borderTop: "1px solid var(--border)" }}>
        <SecondaryActionButton label={cancelLabel} variant="ghost" onClick={onCancel} />
        <div className="rowc">
          {tertiaryLabel ? <SecondaryActionButton label={tertiaryLabel} onClick={onTertiary} /> : null}
          <PrimaryActionButton label={confirmLabel} disabled={confirmDisabled || (requireAck && !acknowledged)} onClick={onConfirm} />
        </div>
      </div>
    </div>
  );
}

function CaptureRow({ children }: { children: ReactNode }) {
  return (
    <div className="rowc">
      <span className="checkbox checked">✓</span>
      <span className="body">{children}</span>
    </div>
  );
}
