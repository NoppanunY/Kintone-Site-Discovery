import type {
  ConnectedSiteModel,
  AuthProfileModel,
  DeveloperFileItem,
  FileOrderItem,
  KpiModel,
  ProjectContextModel,
  ProjectModel,
  ReportItem,
  ScanPreset,
  SensitiveOption,
  SiteWorkspaceModel,
  TabModel,
} from "./types";
import type { AuthProfile, ConnectedSite, Project, ProjectAppList } from "@kintone-site-discovery/core";

export const projectId = "client-crm-discovery";
export const siteId = "client-a-production";

export const connectedSites: ConnectedSiteModel[] = [
  {
    id: siteId,
    name: "Client A Production",
    domain: "client-a.cybozu.com",
    status: "Saved",
    tone: "ok",
    meta: "used by 2 projects",
  },
  {
    id: "dev-sandbox",
    name: "Dev Sandbox",
    domain: "dev.cybozu.com",
    status: "Saved",
    tone: "idle",
    meta: "not used by a project yet",
  },
  {
    id: "vendor-audit-main",
    name: "Vendor Audit Main",
    domain: "vendor.cybozu.com",
    status: "Saved",
    tone: "ok",
    meta: "used by 1 project",
  },
];

export const profiles: AuthProfileModel[] = [
  { id: "production-admin", name: "Production Admin", user: "admin@example.com", status: "Credential saved", tone: "ok", usage: "Used by 1 project" },
  { id: "client-a-admin", name: "Client A Admin", user: "ca-admin@client-a", status: "Needs update", tone: "warn", usage: "Used by 2 projects" },
];

export const projectRows: ProjectModel[] = [
  {
    id: projectId,
    name: "Client CRM Discovery",
    siteId,
    authSelection: { kind: "global_profile", authProfileId: "client-a-admin" },
    path: "~/KintoneDiscovery/client-crm",
    opened: "opened 2h ago",
    meta: "last snapshot 2h ago",
    hasSnapshot: true,
    selectedApps: 4,
    appsAvailable: 18,
    pluginsCaptured: 5,
    redactions: 4,
  },
  {
    id: "client-crm-review-copy",
    name: "Client CRM Review Copy",
    siteId,
    authSelection: { kind: "global_profile", authProfileId: "client-a-admin" },
    path: "~/KintoneDiscovery/client-crm-review-copy",
    opened: "opened 1h ago",
    meta: "never scanned",
    hasSnapshot: false,
    selectedApps: 4,
    appsAvailable: 18,
    pluginsCaptured: 0,
    redactions: 0,
  },
  {
    id: "vendor-audit-2026",
    name: "Vendor Audit 2026",
    siteId: "vendor-audit-main",
    authSelection: { kind: "global_profile", authProfileId: "production-admin" },
    path: "~/Work/vendor-audit",
    opened: "opened yesterday",
    meta: "last snapshot yesterday",
    hasSnapshot: true,
    selectedApps: 6,
    appsAvailable: 14,
    pluginsCaptured: 2,
    redactions: 11,
  },
];

export function getConnectedSiteById(id: string | null | undefined): ConnectedSiteModel {
  return connectedSites.find((site) => site.id === id) ?? connectedSites[0];
}

export function getAuthProfileById(id: string | null | undefined): AuthProfileModel {
  return profiles.find((profile) => profile.id === id) ?? profiles[0];
}

export function authProfileIdForSelection(authSelection: ProjectModel["authSelection"]): string | undefined {
  return authSelection.kind === "global_profile" ? authSelection.authProfileId : undefined;
}

export function getProjectById(id: string | null | undefined): ProjectModel {
  return projectRows.find((project) => project.id === id) ?? projectRows[0];
}

export function projectIdForRouteSegment(id: string | null | undefined): string {
  return projectRows.find((project) => project.id === id)?.id ?? projectRows.find((project) => project.siteId === id)?.id ?? projectRows[0].id;
}

export function projectContext(id: string | null | undefined): ProjectContextModel {
  const project = getProjectById(projectIdForRouteSegment(id));
  const site = getConnectedSiteById(project.siteId);
  const authProfileId = authProfileIdForSelection(project.authSelection);
  const profile = getAuthProfileById(authProfileId);
  const profileName = project.authSelection.kind === "project_local" ? project.authSelection.displayName : profile.name;
  const profileUser = project.authSelection.kind === "project_local" ? project.authSelection.username : profile.user;
  const credentialStatus = project.authSelection.kind === "project_local" ? project.authSelection.credentialStatus : profile.status;

  return {
    ...site,
    id: project.id,
    projectId: project.id,
    projectName: project.name,
    projectPath: project.path,
    opened: project.opened,
    siteId: site.id,
    siteMeta: site.meta,
    authSelection: project.authSelection,
    authProfileId,
    profile: profileName,
    profileUser,
    credentialStatus,
    meta: project.meta,
    hasSnapshot: project.hasSnapshot,
    selectedApps: project.selectedApps,
    appsAvailable: project.appsAvailable,
    pluginsCaptured: project.pluginsCaptured,
    redactions: project.redactions,
  };
}

export const getSiteWorkspaceById = projectContext;

export function tabsForProjectIds(projectIds: string[]): TabModel[] {
  return [
    { id: "home", title: "Home", kind: "home" },
    ...projectIds.map((id) => {
      const project = getProjectById(id);
      return { id: project.id, title: project.name, kind: "project" as const };
    }),
  ];
}

export const tabs: TabModel[] = tabsForProjectIds([projectId, "client-crm-review-copy"]);

export const tabsWithSandbox: TabModel[] = tabs;

export const workspaces = connectedSites.map((site) => ({
  id: site.id,
  name: site.name,
  domain: site.domain,
  meta: site.meta,
  status: site.status,
  tone: site.tone,
}));

export function overviewKpisForSite(site: SiteWorkspaceModel): KpiModel[] {
  return [
    { number: String(site.appsAvailable), label: "Apps available" },
    { number: site.hasSnapshot ? String(site.selectedApps) : "0", label: "Apps in snapshot" },
    { number: String(site.pluginsCaptured), label: "Plugins captured" },
    { number: String(site.redactions), label: "Redactions" },
  ];
}

export function historyRunsForSite(site: SiteWorkspaceModel) {
  if (!site.hasSnapshot) {
    return [];
  }

  if (site.projectId === "vendor-audit-2026") {
    return [
      {
        title: "Jul 6, 2026 · 14:20",
        snapshotId: "snap_20260706_1420",
        meta: "6 apps · Required 104/104 ok · Optional 0 skipped · Warnings 0 · 11 redactions",
        status: "Completed",
        tone: "ok" as const,
        current: true,
      },
    ];
  }

  return historyRuns;
}

export const overviewKpis: KpiModel[] = overviewKpisForSite(projectContext(projectId));

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
    id: "full_discovery",
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

export function connectedSiteModelFromDomain(site: ConnectedSite): ConnectedSiteModel {
  return {
    id: site.id,
    name: site.displayName,
    domain: site.domain,
    status: site.savedStatus === "saved" ? "Saved" : "Unused",
    tone: site.savedStatus === "saved" ? "ok" : "idle",
    meta: `${site.linkedProjectIds.length} linked project${site.linkedProjectIds.length === 1 ? "" : "s"}`,
  };
}

export function authProfileModelFromDomain(profile: AuthProfile): AuthProfileModel {
  return {
    id: profile.id,
    name: profile.displayName,
    user: profile.username,
    status:
      profile.credentialStatus === "saved"
        ? "Credential saved"
        : profile.credentialStatus === "needs_update"
          ? "Needs update"
          : profile.credentialStatus === "invalid"
            ? "Invalid"
            : "No credential",
    tone: profile.credentialStatus === "saved" ? "ok" : profile.credentialStatus === "needs_update" ? "warn" : "idle",
    usage: `Used by ${profile.linkedProjectIds.length} project${profile.linkedProjectIds.length === 1 ? "" : "s"}`,
  };
}

export function projectModelFromDomain(project: Project, site: ConnectedSite | undefined, profile: AuthProfile | undefined, appList?: ProjectAppList): ProjectModel {
  const hasGlobalProfile = project.authSelection.kind === "global_profile";
  const selectedApps = appList?.apps.length ?? 0;
  return {
    id: project.id,
    name: project.name,
    siteId: project.siteId,
    authSelection: project.authSelection,
    path: project.folderPath,
    opened: "opened from local metadata",
    meta: selectedApps > 0 ? `${selectedApps} app${selectedApps === 1 ? "" : "s"} selected · no real snapshot written yet` : "no apps selected yet · no real snapshot written yet",
    hasSnapshot: false,
    selectedApps,
    appsAvailable: selectedApps,
    pluginsCaptured: 0,
    redactions: 0,
    ...(site ? { siteId: site.id } : {}),
    ...(hasGlobalProfile && profile ? { authSelection: { kind: "global_profile" as const, authProfileId: profile.id } } : {}),
  };
}

export const reports: ReportItem[] = [
  { title: "Site summary", description: "Readable overview of apps, spaces, users, plugins and scan warnings.", freshness: "up_to_date" },
  { title: "App customization summary", description: "JS/CSS customization files and where order matters.", freshness: "up_to_date" },
  { title: "Permissions overview", description: "Plain-language role and group access summary.", freshness: "stale" },
];

export const developerFiles: DeveloperFileItem[] = [
  { name: "structured-data.jsonl", size: "1,204 records · 2.1 MB", redacted: true },
  { name: "manifest.json", size: "Index of everything in this snapshot · 18 KB" },
];

export const fileOrder: FileOrderItem[] = [
  { index: 1, name: "001-common.js", orderSource: "api", confidence: "high" },
  { index: 2, name: "002-feature.js", orderSource: "api", confidence: "high" },
  { index: 3, name: "003-finalize.js", orderSource: "api", confidence: "medium" },
];

export const historyRuns = [
  {
    title: "Jul 2, 2026 · 10:35",
    snapshotId: "snap_20260702_1035",
    meta: "4 apps · Required 68/68 ok · Optional 1 skipped · Warnings 2 · 4 redactions",
    status: "Completed with warnings",
    tone: "warn" as const,
    current: true,
  },
  {
    title: "Jun 28, 2026 · 16:02",
    snapshotId: "snap_20260628_1602",
    meta: "12 apps · Required 190/190 ok · Optional 0 skipped · Warnings 0 · 11 redactions",
    status: "Completed",
    tone: "ok" as const,
  },
  {
    title: "Jun 20, 2026 · 09:11",
    snapshotId: "run_20260620_0911_partial",
    meta: "1 app · Reason: sign-in rejected",
    status: "Failed",
    tone: "err" as const,
  },
];
