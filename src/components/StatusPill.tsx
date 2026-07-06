import type { StatusTone } from "../types";

interface StatusPillProps {
  status: StatusTone;
  label: string;
  dot?: boolean;
}

export function StatusPill({ status, label, dot = false }: StatusPillProps) {
  return (
    <span className={`pill pill--${status}`} role="status">
      {dot ? <span className="pill__dot" aria-hidden="true" /> : null}
      {label}
    </span>
  );
}
