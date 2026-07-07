import type { DeveloperFileItem, FileOrderItem, KpiModel, ReportItem, ScanPreset, SensitiveOption, TabModel } from "./types";

export const siteId = "client-a-production";

export const tabs: TabModel[] = [
  { id: "home", title: "Home", kind: "home" },
  { id: siteId, title: "Client A Production", kind: "site" },
];

export const tabsWithSandbox: TabModel[] = [
  ...tabs,
  { id: "dev-sandbox", title: "Dev Sandbox", kind: "site" },
];

export const projectRows = [
  { name: "Client CRM Discovery", path: "~/KintoneDiscovery/client-crm", opened: "opened 2h ago" },
  { name: "Vendor Audit 2026", path: "~/Work/vendor-audit", opened: "opened yesterday" },
];

export const profiles = [
  { name: "Production Admin", user: "admin@example.com", status: "Credential saved", tone: "ok" as const, sites: "Used by 2 sites · 2 projects" },
  { name: "Client A Admin", user: "ca-admin@client-a", status: "Needs update", tone: "warn" as const, sites: "Used by 1 site · 1 project" },
];

export const workspaces = [
  { name: "Client A Production", domain: "client-a.cybozu.com", profile: "Client A Admin", meta: "last snapshot 2h ago", status: "Connected", tone: "ok" as const },
  { name: "Dev Sandbox", domain: "dev.cybozu.com", profile: "Production Admin", meta: "never scanned", status: "Idle", tone: "idle" as const },
];

export const overviewKpis: KpiModel[] = [
  { number: "18", label: "Apps available" },
  { number: "12", label: "Apps in snapshot" },
  { number: "5", label: "Plugins captured" },
  { number: "4", label: "Redactions" },
];

export const apps = [
  { name: "Sales Management", id: "101", space: "Main Portal", facts: "has plugins/customization", status: "In snapshot", tone: "ok" as const, selected: true },
  { name: "Support Tickets", id: "122", space: "Customer Care", facts: "has customization", status: "Last scan: warning", tone: "warn" as const, selected: true },
  { name: "Contracts", id: "130", space: "Legal", facts: "has plugins", status: "In snapshot", tone: "ok" as const, selected: true },
  { name: "Vendor Intake", id: "144", space: "Procurement", facts: "no plugin metadata yet", status: "Not captured", tone: "idle" as const, selected: true },
];

export const presets: ScanPreset[] = [
  {
    id: "quick",
    title: "Quick Scan",
    description: "Structure only — apps, fields, views, permissions, plugin inventory. Fastest.",
    badge: "Required only",
  },
  {
    id: "standard",
    title: "Standard Scan",
    description: "Quick + users and groups, spaces, JS/CSS files, plugin saved config, dependency and preview-vs-live diff.",
    badge: "Recommended",
    selected: true,
  },
  {
    id: "full",
    title: "Full Discovery",
    description: "Standard + opt-in captures. Opens Configure sensitive options — nothing sensitive turns on until you configure and confirm.",
    opensConfig: true,
  },
];

export const requiredOptions: SensitiveOption[] = [
  {
    key: "required",
    label: "17 categories",
    tier: "required",
    value: true,
    locked: true,
    meta: "App settings · form fields and layout · views · process · permissions · notifications · plugin inventory · customization metadata · live + preview",
  },
];

export const recommendedOptions: SensitiveOption[] = [
  { key: "users", label: "Users, groups and departments", tier: "recommended", value: true },
  { key: "spaces", label: "Spaces and members", tier: "recommended", value: true },
  { key: "customization", label: "App customization JS / CSS files", tier: "recommended", value: true },
  { key: "plugin-config", label: "Plugin saved config", tier: "recommended", value: true },
  { key: "dependencies", label: "Dependency detection · preview-vs-live diff", tier: "recommended", value: true },
];

export const additionalOptions: SensitiveOption[] = [
  { key: "plugin-assets", label: "Plugin desktop / config assets (JS/CSS/HTML)", tier: "additional", value: false, sensitive: true },
  { key: "sample-records", label: "Sample records · redacted · max 25", tier: "additional", value: false, sensitive: true },
  { key: "comments", label: "Record comments · attachment metadata", tier: "additional", value: false, sensitive: true },
  { key: "full-record", label: "Full record capture · browser screenshots", tier: "additional", value: false, sensitive: true },
];

export const reports: ReportItem[] = [
  { title: "Site summary", description: "Readable overview of apps, spaces, users, plugins and scan warnings.", freshness: "up_to_date" },
  { title: "App customization summary", description: "JS/CSS customization files and where order matters.", freshness: "up_to_date" },
  { title: "Permissions overview", description: "Plain-language role and group access summary.", freshness: "stale" },
];

export const developerFiles: DeveloperFileItem[] = [
  { name: "structured-data.jsonl", size: "1,204 records · 2.1 MB", redacted: true },
  { name: "export-manifest.json", size: "Index of generated developer files · 18 KB" },
];

export const fileOrder: FileOrderItem[] = [
  { index: 1, name: "001-common.js", orderSource: "api", confidence: "high" },
  { index: 2, name: "002-feature.js", orderSource: "api", confidence: "high" },
  { index: 3, name: "003-finalize.js", orderSource: "api", confidence: "medium" },
];

export const historyRuns = [
  {
    title: "Jul 2, 2026 · 10:35",
    meta: "4 apps · Required 68/68 ok · Optional 1 skipped · Warnings 2 · 4 redactions",
    status: "Completed with warnings",
    tone: "warn" as const,
    current: true,
  },
  {
    title: "Jun 28, 2026 · 16:02",
    meta: "12 apps · Required 190/190 ok · Optional 0 skipped · Warnings 0 · 11 redactions",
    status: "Completed",
    tone: "ok" as const,
  },
  {
    title: "Jun 20, 2026 · 09:11",
    meta: "1 app · Reason: sign-in rejected",
    status: "Failed",
    tone: "err" as const,
  },
];
