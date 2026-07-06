import type { ActionButton } from "../types";
import { PrimaryActionButton, SecondaryActionButton } from "./Buttons";
import { StatusPill } from "./StatusPill";

interface ErrorStateProps {
  code?: string;
  title: string;
  body: string;
  tone: "warn" | "danger";
  actions: ActionButton[];
}

export function ErrorState({ code, title, body, tone, actions }: ErrorStateProps) {
  return (
    <div className={`banner banner--${tone}`} role="alert">
      <span className="banner__icon" aria-hidden="true">
        !
      </span>
      <div className="grow">
        <div className="rowc">
          <h2 className="h2">{title}</h2>
          {code ? <StatusPill status={tone === "danger" ? "err" : "warn"} label={code} /> : null}
        </div>
        <p className="body">{body}</p>
        <div className="btn-row">
          {actions.map((action, index) =>
            index === 0 ? (
              <PrimaryActionButton key={action.label} label={action.label} onClick={action.onClick} disabled={action.disabled} />
            ) : (
              <SecondaryActionButton
                key={action.label}
                label={action.label}
                variant={action.variant === "ghost" ? "ghost" : "secondary"}
                onClick={action.onClick}
                disabled={action.disabled}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}
