import type { AppSummary } from "./types.js";

export interface AppPickerFilters {
  query?: string;
  spaceName?: string;
}

export interface AppPickerGroup {
  spaceName: string;
  apps: AppSummary[];
}

export type AppDiscoveryScopeMode = "all" | "by_space" | "later";

export function projectNameToFolderName(projectName: string): string {
  const normalized = projectName
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[ .]+$/g, "");

  return normalized.length > 0 ? normalized : "Untitled Project";
}

export function defaultProjectFolderPath(defaultProjectsRoot: string, projectName: string): string {
  const root = defaultProjectsRoot.replace(/[\\/]+$/g, "");
  const separator = root.includes("\\") || /^[A-Za-z]:/.test(root) ? "\\" : "/";
  return `${root}${separator}${projectNameToFolderName(projectName)}`;
}

export function projectLocalAuthDisplayName(username: string): string {
  const trimmedUsername = username.trim();
  return `Project auth · ${trimmedUsername.length > 0 ? trimmedUsername : "username pending"}`;
}

export function spaceNameForPicker(app: AppSummary): string {
  return app.spaceName?.trim() || "No Space";
}

export function uniquePickerSpaces(apps: AppSummary[]): string[] {
  return Array.from(new Set(apps.map(spaceNameForPicker))).sort((a, b) => a.localeCompare(b));
}

export function filterAppsForPicker(apps: AppSummary[], filters: AppPickerFilters): AppSummary[] {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const spaceName = filters.spaceName?.trim() ?? "";

  return apps.filter((app) => {
    const appSpace = spaceNameForPicker(app);
    const matchesSpace = spaceName.length === 0 || appSpace === spaceName;
    const searchable = `${app.kintoneAppId} ${app.name} ${appSpace} ${app.hasPlugins ? "plugins" : ""} ${app.hasCustomization ? "customization" : ""}`.toLowerCase();
    return matchesSpace && (query.length === 0 || searchable.includes(query));
  });
}

export function groupAppsBySpace(apps: AppSummary[]): AppPickerGroup[] {
  return uniquePickerSpaces(apps).map((spaceName) => ({
    spaceName,
    apps: apps.filter((app) => spaceNameForPicker(app) === spaceName).sort((a, b) => a.kintoneAppId - b.kintoneAppId),
  }));
}

export function selectedAppCountsBySpace(apps: AppSummary[], selectedAppIds: string[]): Record<string, number> {
  const selectedIds = new Set(selectedAppIds);
  return apps.reduce<Record<string, number>>((counts, app) => {
    if (!selectedIds.has(app.id)) {
      return counts;
    }
    const spaceName = spaceNameForPicker(app);
    counts[spaceName] = (counts[spaceName] ?? 0) + 1;
    return counts;
  }, {});
}

export function appIdsForDiscoveryScope(apps: AppSummary[], mode: AppDiscoveryScopeMode, selectedSpaceNames: string[] = []): string[] {
  if (mode === "later") {
    return [];
  }

  if (mode === "all") {
    return apps.map((app) => app.id);
  }

  const selectedSpaces = new Set(selectedSpaceNames);
  return apps.filter((app) => selectedSpaces.has(spaceNameForPicker(app))).map((app) => app.id);
}
