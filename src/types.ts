import type { ReactNode } from "react";
import type { PresetId, ProjectAuthSelection, ResultStatus as DomainResultStatus } from "@kintone-site-discovery/core";

export type Id = string;

export type TabKind = "home" | "project";

export interface TabModel {
  id: Id;
  title: string;
  kind: TabKind;
  running?: boolean;
}

export interface ConnectedSiteModel {
  id: Id;
  name: string;
  domain: string;
  status: string;
  tone: StatusTone;
  meta: string;
}

export interface AuthProfileModel {
  id: Id;
  name: string;
  user: string;
  status: string;
  tone: StatusTone;
  usage: string;
}

export interface ProjectModel {
  id: Id;
  name: string;
  siteId: Id;
  authSelection: ProjectAuthSelection;
  path: string;
  opened: string;
  meta: string;
  hasSnapshot: boolean;
  selectedApps: number;
  appsAvailable: number;
  pluginsCaptured: number;
  redactions: number;
}

export interface ProjectContextModel extends ConnectedSiteModel {
  projectId: Id;
  projectName: string;
  projectPath: string;
  opened: string;
  siteId: Id;
  siteMeta: string;
  authSelection: ProjectAuthSelection;
  authProfileId?: Id;
  profile: string;
  profileUser: string;
  credentialStatus: string;
  hasSnapshot: boolean;
  selectedApps: number;
  appsAvailable: number;
  pluginsCaptured: number;
  redactions: number;
}

export type SiteWorkspaceModel = ProjectContextModel;

export interface TopMenuItemModel {
  label: string;
  description?: string;
  onSelect?: () => void;
  disabled?: boolean;
  shortcut?: string;
  items?: TopMenuItemModel[];
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

export type ResultStatus = DomainResultStatus;
export type ResultStatusLabel = "Completed" | "Completed with warnings" | "Failed";

export interface ActionButton {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

export type MockFeedbackTone = "info" | "ok" | "warn" | "err";

export interface MockFeedbackOptions {
  tone?: MockFeedbackTone;
  sticky?: boolean;
}

export type MockActionHandler = (message: string, options?: MockFeedbackOptions) => void;

export type ConnectionTestStatus = "testing" | "passed" | "failed";

export interface ConnectionTestTarget {
  siteName: string;
  domain: string;
  authProfile: string;
}

export interface ConnectionTestResult extends ConnectionTestTarget {
  status: ConnectionTestStatus;
  checkedAt?: string;
  checks: string[];
  errorSummary?: string;
  likelyCause?: string;
  nextAction?: string;
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
  id: PresetId;
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
