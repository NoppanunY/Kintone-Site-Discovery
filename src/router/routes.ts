import type { NavKey } from "../types";
import { projectContext, projectId } from "../mockData";

export function projectRouteByNavForProject(activeProjectId: string): Record<NavKey, string> {
  return {
    overview: `/project/${activeProjectId}/overview`,
    apps: `/project/${activeProjectId}/apps`,
    scan: `/project/${activeProjectId}/scan`,
    snapshot: `/project/${activeProjectId}/snapshot`,
    reports: `/project/${activeProjectId}/reports`,
    "developer-files": `/project/${activeProjectId}/developer-files`,
    history: `/project/${activeProjectId}/history`,
    settings: `/project/${activeProjectId}/settings`,
    advanced: `/project/${activeProjectId}/advanced`,
  };
}

export const projectRouteByNav: Record<NavKey, string> = projectRouteByNavForProject(projectId);

export function isProjectRoute(pathname: string) {
  return pathname.startsWith("/project/") || pathname.startsWith("/site/");
}

export function projectIdFromPath(pathname: string) {
  const match = pathname.match(/^\/(?:project|site)\/([^/]+)/);
  return projectContext(match?.[1]).projectId;
}

export function navFromPath(pathname: string): NavKey {
  if (pathname.includes("/apps")) return "apps";
  if (pathname.includes("/scan")) return "scan";
  if (pathname.includes("/snapshot")) return "snapshot";
  if (pathname.includes("/reports")) return "reports";
  if (pathname.includes("/developer-files")) return "developer-files";
  if (pathname.includes("/history")) return "history";
  if (pathname.includes("/settings")) return "settings";
  if (pathname.includes("/advanced")) return "advanced";
  return "overview";
}

export function activeTabFromPath(pathname: string) {
  return isProjectRoute(pathname) ? projectIdFromPath(pathname) : "home";
}

export const siteRouteByNavForSite = projectRouteByNavForProject;
export const siteRouteByNav = projectRouteByNav;
export const isSiteRoute = isProjectRoute;
export const siteIdFromPath = projectIdFromPath;
