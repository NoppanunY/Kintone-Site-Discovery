import { useEffect, useMemo, useState } from "react";
import { AppShell, ConfirmationModal } from "./components";
import { getSiteWorkspaceById, siteId, tabsForSiteIds } from "./mockData";
import { activeTabFromPath, isSiteRoute, navFromPath, siteIdFromPath, siteRouteByNav, siteRouteByNavForSite } from "./router/routes";
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
import type { MockActionHandler, MockFeedbackTone, NavKey, SiteWorkspaceModel, TopMenuModel } from "./types";

type OnboardingEntry = "new-project" | "add-site" | "add-auth";

interface MockFeedbackState {
  id: number;
  message: string;
  tone: MockFeedbackTone;
  sticky: boolean;
}

function onboardingPath(entry: OnboardingEntry) {
  return `/onboarding?entry=${entry}`;
}

export function App() {
  const [locationKey, setLocationKey] = useState(0);
  const [mockFeedback, setMockFeedback] = useState<MockFeedbackState | null>(null);
  const [openSiteTabIds, setOpenSiteTabIds] = useState<string[]>([siteId, "dev-sandbox"]);
  const pathname = window.location.pathname;
  const search = window.location.search;

  useEffect(() => {
    const onPopState = () => setLocationKey((key) => key + 1);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!mockFeedback || mockFeedback.sticky) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMockFeedback((current) => (current?.id === mockFeedback.id ? null : current));
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [mockFeedback]);

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setLocationKey((key) => key + 1);
  };

  const activeNav = navFromPath(pathname);
  const activeSiteId = siteIdFromPath(pathname);
  const activeSite = getSiteWorkspaceById(activeSiteId);
  const siteRoutes = siteRouteByNavForSite(activeSite.id);
  const activeTabId = activeTabFromPath(pathname);
  const shellVariant = isSiteRoute(pathname) ? "site" : "home";
  const visibleTabs = tabsForSiteIds(openSiteTabIds);
  const showMockAction: MockActionHandler = (message, options = {}) => {
    setMockFeedback({
      id: Date.now(),
      message,
      tone: options.tone ?? "info",
      sticky: options.sticky ?? options.tone === "err",
    });
  };
  const openSiteTab = (id: string, nav: NavKey = "overview") => {
    const site = getSiteWorkspaceById(id);
    setOpenSiteTabIds((current) => (current.includes(site.id) ? current : [...current, site.id]));
    navigate(siteRouteByNavForSite(site.id)[nav]);
  };

  const closeSiteTab = (id: string) => {
    setOpenSiteTabIds((current) => current.filter((tabId) => tabId !== id));
    if (id === activeTabId) {
      navigate("/");
    }
  };

  const menus = buildTopMenus(navigate, showMockAction, activeSite, shellVariant === "site");
  const onboardingEntry = getOnboardingEntry(search);

  const screen = useMemo(
    () =>
      renderScreen({
        pathname,
        search,
        navigate,
        onMockAction: showMockAction,
        activeSite,
        siteRoutes,
        openSiteTab,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname, search, locationKey],
  );

  if (pathname.startsWith("/onboarding")) {
    return (
      <OnboardingScreen
        entry={onboardingEntry}
        onCancel={() => navigate("/")}
        onFinish={() => navigate(onboardingEntry === "add-auth" ? "/home/accounts" : siteRouteByNav.overview)}
        onMockAction={showMockAction}
      />
    );
  }

  return (
    <div className="canvas">
      <div className={pathname.endsWith("/scan/confirm") ? "modal-host" : "app-host"}>
        <AppShell
          projectName={activeSite.projectName}
          tabs={visibleTabs}
          activeTabId={activeTabId}
          activeNav={activeNav}
          menus={menus}
          variant={shellVariant}
          onNewTab={() => navigate("/new-tab")}
          onCloseTab={closeSiteTab}
          onSelectTab={(id) => {
            if (id === "home") {
              navigate("/");
              return;
            }
            openSiteTab(id, activeNav);
          }}
          onNavigate={(key: NavKey) => navigate(siteRouteByNavForSite(activeSite.id)[key])}
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
              onCancel={() => navigate(siteRoutes.scan)}
              onTertiary={() => navigate(`${siteRoutes.scan}/run`)}
              onConfirm={() => navigate(`${siteRoutes.scan}/run`)}
            />
          </div>
        ) : null}
        {mockFeedback ? (
          <div className={`mock-toast mock-toast--${mockFeedback.tone}`} role={mockFeedback.tone === "err" ? "alert" : "status"} aria-live="polite">
            <span>{mockFeedback.message}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => setMockFeedback(null)}>
              ×
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function buildTopMenus(
  navigate: (path: string) => void,
  onMockAction: MockActionHandler,
  activeSite: SiteWorkspaceModel,
  hasActiveSiteTab: boolean,
): TopMenuModel[] {
  const activeSiteRoutes = siteRouteByNavForSite(activeSite.id);
  const activeSiteCommand = (label: string, onSelect: () => void, shortcut?: string) => ({
    label,
    shortcut,
    disabled: !hasActiveSiteTab,
    onSelect,
  });

  return [
    {
      label: "Project",
      items: [
        { label: "Projects", shortcut: "Ctrl+1", onSelect: () => navigate("/") },
        { label: "New project", onSelect: () => navigate(onboardingPath("new-project")) },
        { label: "Open project folder...", onSelect: () => onMockAction("Project folder opening is not connected yet. No folder was opened.") },
      ],
    },
    {
      label: "Account",
      items: [
        { label: "Auth profiles", onSelect: () => navigate("/home/accounts") },
        { label: "Add auth profile", onSelect: () => navigate(onboardingPath("add-auth")) },
        { label: "Test selected auth profile", onSelect: () => navigate(`/home/accounts?test=Production%20Admin&testAt=${Date.now()}`) },
      ],
    },
    {
      label: "Site",
      items: [
        { label: "Site workspaces", onSelect: () => navigate("/home/sites") },
        { label: "Add site workspace", onSelect: () => navigate(onboardingPath("add-site")) },
        activeSiteCommand(`Active site overview · ${activeSite.name}`, () => navigate(activeSiteRoutes.overview)),
        activeSiteCommand("Active site apps", () => navigate(activeSiteRoutes.apps)),
        activeSiteCommand("Active site settings", () => navigate(activeSiteRoutes.settings)),
      ],
    },
    {
      label: "Scan",
      items: [
        activeSiteCommand("Open scan setup", () => navigate(activeSiteRoutes.scan)),
        activeSiteCommand("Configure sensitive options", () => navigate(`${activeSiteRoutes.scan}/advanced`)),
        activeSiteCommand("Open scan progress", () => navigate(`${activeSiteRoutes.scan}/run`)),
      ],
    },
    {
      label: "Snapshot",
      items: [
        activeSiteCommand("Active site Local Snapshot", () => navigate(activeSiteRoutes.snapshot)),
        activeSiteCommand("Active site reports", () => navigate(activeSiteRoutes.reports)),
        activeSiteCommand("Active site developer files", () => navigate(activeSiteRoutes["developer-files"])),
        activeSiteCommand("Active site history", () => navigate(activeSiteRoutes.history)),
      ],
    },
    {
      label: "Window",
      items: [
        { label: "New tab", shortcut: "Ctrl+T", onSelect: () => navigate("/new-tab") },
        { label: "Home", shortcut: "Ctrl+H", onSelect: () => navigate("/") },
        { label: "Close tab", shortcut: "Ctrl+W", onSelect: () => navigate("/") },
      ],
    },
    {
      label: "Help",
      align: "end",
      items: [
        {
          label: "About Kintone Site Discovery",
          onSelect: () => onMockAction("Kintone Site Discovery · MVP 1 desktop preview shell."),
        },
        { label: "Documentation", onSelect: () => onMockAction("Documentation link is not connected yet.") },
      ],
    },
  ];
}

function getOnboardingEntry(search: string): OnboardingEntry {
  const entry = new URLSearchParams(search).get("entry");
  if (entry === "add-site" || entry === "add-auth") {
    return entry;
  }

  return "new-project";
}

function renderScreen({
  pathname,
  search,
  navigate,
  onMockAction,
  activeSite,
  siteRoutes,
  openSiteTab,
}: {
  pathname: string;
  search: string;
  navigate: (path: string) => void;
  onMockAction: MockActionHandler;
  activeSite: SiteWorkspaceModel;
  siteRoutes: Record<NavKey, string>;
  openSiteTab: (id: string, nav?: NavKey) => void;
}) {
  if (pathname === "/" || pathname === "/home/accounts" || pathname === "/home/sites") {
    const requestedAuthTest = new URLSearchParams(search).get("test");
    return (
      <ProjectHomeScreen
        onAddProfile={() => navigate(onboardingPath("add-auth"))}
        onAddSite={() => navigate(onboardingPath("add-site"))}
        onNewProject={() => navigate(onboardingPath("new-project"))}
        onOpenSite={(id) => openSiteTab(id, "overview")}
        onMockAction={onMockAction}
        requestedAuthTest={requestedAuthTest}
        requestedAuthTestKey={search}
      />
    );
  }

  if (pathname === "/new-tab") {
    return <NewTabScreen onAddSite={() => navigate(onboardingPath("add-site"))} onOpenSite={() => openSiteTab(siteId, "overview")} />;
  }

  if (pathname.endsWith("/apps")) {
    return <AppsScreen site={activeSite} onContinue={() => navigate(siteRoutes.scan)} onMockAction={onMockAction} />;
  }

  if (pathname.endsWith("/scan/advanced") || pathname.endsWith("/scan/confirm")) {
    return <SensitiveOptionsScreen site={activeSite} compact={pathname.endsWith("/scan/confirm")} onBack={() => navigate(siteRoutes.scan)} onConfirm={() => navigate(`${siteRoutes.scan}/confirm`)} />;
  }

  if (pathname.endsWith("/scan/run")) {
    const source = new URLSearchParams(search).get("source");
    return (
      <ScanRunningScreen
        source={source === "rerun" ? "rerun" : "new"}
        site={activeSite}
        onCancel={() => {
          onMockAction("Preview scan cancelled. No runner or snapshot was stopped because the runner is not connected yet.");
          navigate(siteRoutes.scan);
        }}
        onChangeSettings={() => navigate(siteRoutes.scan)}
      />
    );
  }

  if (pathname.endsWith("/scan/result")) {
    const params = new URLSearchParams(search);
    const mode = params.get("state") === "failed" ? "failed" : params.get("state") === "completed" ? "completed" : "warnings";
    return (
      <ScanResultScreen
        mode={mode}
        site={activeSite}
        onReports={() => navigate(siteRoutes.reports)}
        onSnapshot={() => navigate(siteRoutes.snapshot)}
        onDeveloperFiles={() => navigate(siteRoutes["developer-files"])}
        onRetry={() => navigate(siteRoutes.scan)}
        onFixConnection={() => navigate("/home/accounts")}
        onPartialSummary={() => navigate(siteRoutes.snapshot)}
        onMockAction={onMockAction}
      />
    );
  }

  if (pathname.endsWith("/scan")) {
    return <ScanSetupScreen site={activeSite} onAdvanced={() => navigate(`${siteRoutes.scan}/advanced`)} onStart={() => navigate(`${siteRoutes.scan}/run`)} onMockAction={onMockAction} />;
  }

  if (pathname.endsWith("/snapshot")) {
    return <LocalSnapshotScreen site={activeSite} onChangeSettings={() => navigate(siteRoutes.scan)} onMockAction={onMockAction} />;
  }

  if (pathname.includes("/reports")) {
    return <ReportsScreen site={activeSite} onMockAction={onMockAction} />;
  }

  if (pathname.endsWith("/developer-files")) {
    return <DeveloperFilesScreen site={activeSite} onMockAction={onMockAction} />;
  }

  if (pathname.includes("/history")) {
    return <HistoryScreen site={activeSite} onMockAction={onMockAction} />;
  }

  if (pathname.endsWith("/settings")) {
    return <SettingsScreen site={activeSite} onMockAction={onMockAction} />;
  }

  if (pathname.endsWith("/advanced")) {
    return <AdvancedInternalDataScreen site={activeSite} />;
  }

  return (
    <SiteOverviewScreen
      site={activeSite}
      onScanSettings={() => navigate(siteRoutes.scan)}
      onSnapshot={() => navigate(siteRoutes.snapshot)}
      onReports={() => navigate(siteRoutes.reports)}
      onDeveloperFiles={() => navigate(siteRoutes["developer-files"])}
      onMockAction={onMockAction}
    />
  );
}
