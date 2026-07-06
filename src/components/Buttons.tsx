import type { ReactNode } from "react";

interface BaseButtonProps {
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  size?: "md" | "sm";
  onClick?: () => void;
}

interface PrimaryActionButtonProps extends BaseButtonProps {
  tone?: "primary" | "danger";
}

interface SecondaryActionButtonProps extends BaseButtonProps {
  variant?: "secondary" | "ghost";
}

export function PrimaryActionButton({
  label,
  icon,
  disabled,
  loading,
  size = "md",
  tone = "primary",
  onClick,
}: PrimaryActionButtonProps) {
  const toneClass = tone === "danger" ? "btn--danger" : "btn--primary";
  return (
    <button
      type="button"
      className={`btn ${toneClass} ${size === "sm" ? "btn--sm" : ""}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
    >
      {icon ? (
        <span className="btn__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {loading ? "Working..." : label}
    </button>
  );
}

export function SecondaryActionButton({
  label,
  icon,
  disabled,
  loading,
  size = "md",
  variant = "secondary",
  onClick,
}: SecondaryActionButtonProps) {
  return (
    <button
      type="button"
      className={`btn ${variant === "ghost" ? "btn--ghost" : ""} ${size === "sm" ? "btn--sm" : ""}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
    >
      {icon ? (
        <span className="btn__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {loading ? "Working..." : label}
    </button>
  );
}
