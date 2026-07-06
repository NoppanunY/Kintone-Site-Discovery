import type { ReactNode } from "react";

interface WarningBannerProps {
  tone: "info" | "ok" | "warn" | "danger";
  icon?: ReactNode;
  children: ReactNode;
}

export function WarningBanner({ tone, icon, children }: WarningBannerProps) {
  return (
    <div className={`banner banner--${tone}`} role={tone === "warn" || tone === "danger" ? "alert" : "status"}>
      <span className="banner__icon" aria-hidden="true">
        {icon ?? (tone === "danger" || tone === "warn" ? "!" : "i")}
      </span>
      <div>{children}</div>
    </div>
  );
}
