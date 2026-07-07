import type { ReactNode } from "react";

export type Id = string;

export type TabKind = "home" | "site";

export interface TabModel {
  id: Id;
  title: string;
  kind: TabKind;
  running?: boolean;
}

export interface TopMenuItemModel {
  label: string;
  onSelect?: () => void;
  disabled?: boolean;
  shortcut?: string;
}

export interface TopMenuModel {
  label: string;
  items: TopMenuItemModel[];
  align?: "start" | "end";
}

export type NavKey =
  | "overview"
  | "apps"
  | "scan"
  | "snapshot"
  | "reports"
  | "developer-files"
  | "history"
  | "settings"
  | "advanced";

export type StatusTone = "ok" | "warn" | "err" | "info" | "idle" | "run";

export type ResultStatus = "Completed" | "Completed with warnings" | "Failed";

export interface ActionButton {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

export interface KpiModel {
  number: string;
  label: string;
}

export interface ReportItem {
  title: string;
  description: string;
  freshness: "up_to_date" | "stale";
}

export interface DeveloperFileItem {
  name: string;
  size: string;
  redacted?: boolean;
}

export interface FileOrderItem {
  index: number;
  name: string;
  orderSource: string;
  confidence: "high" | "medium" | "low";
}

export interface ScanPreset {
  id: "quick" | "standard" | "full";
  title: string;
  description: string;
  badge?: string;
  selected?: boolean;
  opensConfig?: boolean;
}

export interface SensitiveOption {
  key: string;
  label: string;
  tier: "required" | "recommended" | "additional";
  value: boolean;
  locked?: boolean;
  sensitive?: boolean;
  meta?: string;
}

export interface EmptyStateModel {
  icon: ReactNode;
  title: string;
  body: string;
  actionLabel?: string;
}
