import type { ReactNode } from "react";

interface WarningBannerProps {
  tone: "info" | "ok" | "warn" | "danger";
  icon?: ReactNode;
  children: ReactNode;
}

export function WarningBanner({ tone, icon, children }: WarningBannerProps) {
  const defaultIcon = tone === "danger" ? "✕" : tone === "warn" ? "⚠" : tone === "ok" ? "✓" : "ⓘ";
  return (
    <div className={`banner banner--${tone}`} role={tone === "warn" || tone === "danger" ? "alert" : "status"}>
      <span className="bi" aria-hidden="true">
        {icon ?? defaultIcon}
      </span>
      <div>{children}</div>
    </div>
  );
}
