import type { ReportItem } from "../types";
import { PrimaryActionButton, SecondaryActionButton } from "./Buttons";
import { StatusPill } from "./StatusPill";

interface ReportListItemProps {
  item: ReportItem;
  primary?: boolean;
  onOpen?: () => void;
}

export function ReportListItem({ item, primary, onOpen }: ReportListItemProps) {
  return (
    <div className="li">
      <span className="nav-item__icon" aria-hidden="true">
        ▦
      </span>
      <div className="grow">
        <div className="h3">{item.title}</div>
        <div className="small muted2">{item.description}</div>
      </div>
      <StatusPill status={item.freshness === "up_to_date" ? "ok" : "warn"} label={item.freshness === "up_to_date" ? "Up to date" : "Stale"} />
      {primary ? <PrimaryActionButton label="Open report" size="sm" onClick={onOpen} /> : <SecondaryActionButton label="Open report" size="sm" variant="ghost" onClick={onOpen} />}
    </div>
  );
}
