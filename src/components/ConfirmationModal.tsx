import { useState } from "react";
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
  onConfirm,
  onCancel,
  onTertiary,
}: ConfirmationModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="modal__section">
        <div className="rowc">
          <span className={`pill pill--${tone === "danger" ? "err" : "warn"}`}>!</span>
          <h2 id="confirm-title" className="h1">
            {title}
          </h2>
        </div>
        <p className="body muted">{body}</p>
      </div>
      {items.length > 0 ? (
        <div className="modal__section">
          <div className="h3">Will be captured</div>
          <div className="list">
            {items.map((item) => (
              <div key={item} className="li">
                <span className="checkbox checkbox--checked" aria-hidden="true">
                  ✓
                </span>
                <span className="body">{item}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {requireAck ? (
        <div className="modal__section">
          <label className="rowc">
            <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.currentTarget.checked)} />
            <span className="body">{ackLabel}</span>
          </label>
        </div>
      ) : null}
      <div className="modal__section between">
        <SecondaryActionButton label={cancelLabel} variant="ghost" onClick={onCancel} />
        <div className="rowc">
          {tertiaryLabel ? <SecondaryActionButton label={tertiaryLabel} onClick={onTertiary} /> : null}
          <PrimaryActionButton label={confirmLabel} disabled={requireAck && !acknowledged} onClick={onConfirm} />
        </div>
      </div>
    </div>
  );
}
