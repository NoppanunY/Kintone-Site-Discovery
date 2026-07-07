import type { NavKey } from "../types";
import { getSiteWorkspaceById, siteId } from "../mockData";

export function siteRouteByNavForSite(siteWorkspaceId: string): Record<NavKey, string> {
  return {
    overview: `/site/${siteWorkspaceId}/overview`,
    apps: `/site/${siteWorkspaceId}/apps`,
    scan: `/site/${siteWorkspaceId}/scan`,
    snapshot: `/site/${siteWorkspaceId}/snapshot`,
    reports: `/site/${siteWorkspaceId}/reports`,
    "developer-files": `/site/${siteWorkspaceId}/developer-files`,
    history: `/site/${siteWorkspaceId}/history`,
    settings: `/site/${siteWorkspaceId}/settings`,
    advanced: `/site/${siteWorkspaceId}/advanced`,
  };
}

export const siteRouteByNav: Record<NavKey, string> = siteRouteByNavForSite(siteId);

export function isSiteRoute(pathname: string) {
  return pathname.startsWith("/site/");
}

export function siteIdFromPath(pathname: string) {
  const match = pathname.match(/^\/site\/([^/]+)/);
  return getSiteWorkspaceById(match?.[1]).id;
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
  return isSiteRoute(pathname) ? siteIdFromPath(pathname) : "home";
}
