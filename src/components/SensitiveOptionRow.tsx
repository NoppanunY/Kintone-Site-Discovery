import type { SensitiveOption } from "../types";
import { StatusPill } from "./StatusPill";

interface SensitiveOptionRowProps {
  option: SensitiveOption;
  onChange?: (key: string) => void;
}

export function SensitiveOptionRow({ option, onChange }: SensitiveOptionRowProps) {
  const locked = Boolean(option.locked);
  return (
    <div className="option-row">
      {locked ? (
        <span className="checkbox checkbox--locked" aria-hidden="true">
          🔒
        </span>
      ) : (
        <button
          type="button"
          className={`toggle ${option.value ? "toggle--on" : ""}`}
          role="switch"
          aria-checked={option.value}
          aria-label={option.label}
          onClick={() => onChange?.(option.key)}
        />
      )}
      <div className="grow">
        <div className="rowc">
          <span className="h3">{option.label}</span>
          {option.sensitive ? <StatusPill status="warn" label="Sensitive" /> : null}
        </div>
        {option.meta ? <div className="small muted2">{option.meta}</div> : null}
      </div>
      {locked ? <StatusPill status="info" label="Always on" /> : null}
    </div>
  );
}
