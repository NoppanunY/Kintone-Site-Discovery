import { useEffect, useMemo, useState } from "react";
import { AppShell, ConfirmationModal } from "./components";
import { tabs } from "./mockData";
import { activeTabFromPath, isSiteRoute, navFromPath, siteRouteByNav } from "./router/routes";
import { AdvancedInternalDataScreen } from "./screens/AdvancedInternalDataScreen";
import { AppsScreen } from "./screens/AppsScreen";
import { DeveloperFilesScreen } from "./screens/DeveloperFilesScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { LocalSnapshotScreen } from "./screens/LocalSnapshotScreen";
import { NewTabScreen } from "./screens/NewTabScreen";
import { OnboardingScreen } from "./screens/onboarding/OnboardingScreen";
import { ProjectHomeScreen } from "./screens/ProjectHomeScreen";
import { ReportsScreen } from "./screens/ReportsScreen";
import { ScanResultScreen } from "./screens/ScanResultScreen";
import { ScanRunningScreen } from "./screens/ScanRunningScreen";
import { ScanSetupScreen } from "./screens/ScanSetupScreen";
import { SensitiveOptionsScreen } from "./screens/SensitiveOptionsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { SiteOverviewScreen } from "./screens/SiteOverviewScreen";
import type { NavKey } from "./types";

export function App() {
  const [locationKey, setLocationKey] = useState(0);
  const pathname = window.location.pathname;
  const search = window.location.search;

  useEffect(() => {
    const onPopState = () => setLocationKey((key) => key + 1);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setLocationKey((key) => key + 1);
  };

  const activeNav = navFromPath(pathname);
  const activeTabId = activeTabFromPath(pathname);
  const shellVariant = isSiteRoute(pathname) ? "site" : "home";

  const screen = useMemo(
    () =>
      renderScreen({
        pathname,
        search,
        navigate,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname, search, locationKey],
  );

  if (pathname === "/onboarding") {
    return <OnboardingScreen onFinish={() => navigate(siteRouteByNav.overview)} />;
  }

  return (
    <div className="canvas">
      <div className={pathname.endsWith("/scan/confirm") ? "modal-host" : ""}>
        <AppShell
          projectName="Client CRM Discovery"
          tabs={tabs}
          activeTabId={activeTabId}
          activeNav={activeNav}
          variant={shellVariant}
          onNewTab={() => navigate("/new-tab")}
          onCloseTab={() => navigate("/")}
          onSelectTab={(id) => navigate(id === "home" ? "/" : siteRouteByNav.overview)}
          onNavigate={(key: NavKey) => navigate(siteRouteByNav[key])}
        >
          {screen}
        </AppShell>
        {pathname.endsWith("/scan/confirm") ? (
          <div className="modal-overlay">
            <ConfirmationModal
              title="Confirm sensitive capture"
              body="This scan will capture data that may include proprietary code or personal information. It stays local and redacted."
              items={["Plugin desktop / config assets (JS/CSS/HTML)", "Sample records — redacted · max 25"]}
              requireAck
              ackLabel="I understand these outputs may contain sensitive data."
              confirmLabel="Confirm & start scan"
              cancelLabel="Cancel"
              tertiaryLabel="Turn these off"
              tone="warn"
              onCancel={() => navigate(siteRouteByNav.scan)}
              onTertiary={() => navigate(`${siteRouteByNav.scan}/run`)}
              onConfirm={() => navigate(`${siteRouteByNav.scan}/run`)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function renderScreen({ pathname, search, navigate }: { pathname: string; search: string; navigate: (path: string) => void }) {
  if (pathname === "/" || pathname === "/home/accounts" || pathname === "/home/sites") {
    return <ProjectHomeScreen onOpenSite={() => navigate(siteRouteByNav.overview)} />;
  }

  if (pathname === "/new-tab") {
    return <NewTabScreen onOpenSite={() => navigate(siteRouteByNav.overview)} />;
  }

  if (pathname.endsWith("/apps")) {
    return <AppsScreen onContinue={() => navigate(siteRouteByNav.scan)} />;
  }

  if (pathname.endsWith("/scan/advanced") || pathname.endsWith("/scan/confirm")) {
    return <SensitiveOptionsScreen onBack={() => navigate(siteRouteByNav.scan)} onConfirm={() => navigate(`${siteRouteByNav.scan}/confirm`)} />;
  }

  if (pathname.endsWith("/scan/run")) {
    return <ScanRunningScreen />;
  }

  if (pathname.endsWith("/scan/result")) {
    const params = new URLSearchParams(search);
    const mode = params.get("state") === "failed" ? "failed" : params.get("state") === "completed" ? "completed" : "warnings";
    return (
      <ScanResultScreen
        mode={mode}
        onReports={() => navigate(siteRouteByNav.reports)}
        onSnapshot={() => navigate(siteRouteByNav.snapshot)}
        onDeveloperFiles={() => navigate(siteRouteByNav["developer-files"])}
        onRetry={() => navigate(siteRouteByNav.scan)}
      />
    );
  }

  if (pathname.endsWith("/scan")) {
    return <ScanSetupScreen onAdvanced={() => navigate(`${siteRouteByNav.scan}/advanced`)} onStart={() => navigate(`${siteRouteByNav.scan}/run`)} />;
  }

  if (pathname.endsWith("/snapshot")) {
    return <LocalSnapshotScreen onRunScan={() => navigate(siteRouteByNav.scan)} />;
  }

  if (pathname.includes("/reports")) {
    return <ReportsScreen />;
  }

  if (pathname.endsWith("/developer-files")) {
    return <DeveloperFilesScreen />;
  }

  if (pathname.includes("/history")) {
    return <HistoryScreen />;
  }

  if (pathname.endsWith("/settings")) {
    return <SettingsScreen />;
  }

  if (pathname.endsWith("/advanced")) {
    return <AdvancedInternalDataScreen />;
  }

  return (
    <SiteOverviewScreen
      onRunScan={() => navigate(siteRouteByNav.scan)}
      onSnapshot={() => navigate(siteRouteByNav.snapshot)}
      onReports={() => navigate(siteRouteByNav.reports)}
      onDeveloperFiles={() => navigate(siteRouteByNav["developer-files"])}
    />
  );
}
