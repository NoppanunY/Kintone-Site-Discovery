import type { NavKey } from "../types";
import { siteId } from "../mockData";

export const siteRouteByNav: Record<NavKey, string> = {
  overview: `/site/${siteId}/overview`,
  apps: `/site/${siteId}/apps`,
  scan: `/site/${siteId}/scan`,
  snapshot: `/site/${siteId}/snapshot`,
  reports: `/site/${siteId}/reports`,
  "developer-files": `/site/${siteId}/developer-files`,
  history: `/site/${siteId}/history`,
  settings: `/site/${siteId}/settings`,
  advanced: `/site/${siteId}/advanced`,
};

export function isSiteRoute(pathname: string) {
  return pathname.startsWith("/site/");
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
  return isSiteRoute(pathname) ? siteId : "home";
}
