import type { ReactNode } from "react";
import { PrimaryActionButton } from "./Buttons";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <h2 className="h2">{title}</h2>
        <p className="body muted">{body}</p>
      </div>
      {actionLabel ? <PrimaryActionButton label={actionLabel} onClick={onAction} /> : null}
    </div>
  );
}
