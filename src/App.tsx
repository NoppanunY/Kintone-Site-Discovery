import { useEffect, useMemo, useState } from "react";
import { AppShell, ConfirmationModal } from "./components";
import { projectContext, projectId, tabsForProjectIds } from "./mockData";
import { activeTabFromPath, isProjectRoute, navFromPath, projectIdFromPath, projectRouteByNav, projectRouteByNavForProject } from "./router/routes";
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

function onboardingPath(entry: OnboardingEntry, preselectedSiteId?: string) {
  const params = new URLSearchParams({ entry });
  if (preselectedSiteId) {
    params.set("site", preselectedSiteId);
  }

  return `/onboarding?${params.toString()}`;
}

export function App() {
  const [locationKey, setLocationKey] = useState(0);
  const [mockFeedback, setMockFeedback] = useState<MockFeedbackState | null>(null);
  const [openProjectTabIds, setOpenProjectTabIds] = useState<string[]>([projectId, "client-crm-review-copy"]);
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
  const activeProjectId = projectIdFromPath(pathname);
  const activeProject = projectContext(activeProjectId);
  const projectRoutes = projectRouteByNavForProject(activeProject.projectId);
  const activeTabId = activeTabFromPath(pathname);
  const shellVariant = isProjectRoute(pathname) ? "site" : "home";
  const visibleTabs = tabsForProjectIds(openProjectTabIds);
  const showMockAction: MockActionHandler = (message, options = {}) => {
    setMockFeedback({
      id: Date.now(),
      message,
      tone: options.tone ?? "info",
      sticky: options.sticky ?? options.tone === "err",
    });
  };
  const openProjectTab = (id: string, nav: NavKey = "overview") => {
    const project = projectContext(id);
    setOpenProjectTabIds((current) => (current.includes(project.projectId) ? current : [...current, project.projectId]));
    navigate(projectRouteByNavForProject(project.projectId)[nav]);
  };

  const closeProjectTab = (id: string) => {
    setOpenProjectTabIds((current) => current.filter((tabId) => tabId !== id));
    if (id === activeTabId) {
      navigate("/");
    }
  };

  const menus = buildTopMenus(navigate, showMockAction, activeProject, shellVariant === "site");
  const onboardingEntry = getOnboardingEntry(search);
  const onboardingSiteId = new URLSearchParams(search).get("site");

  const screen = useMemo(
    () =>
      renderScreen({
        pathname,
        search,
        navigate,
        onMockAction: showMockAction,
        activeProject,
        projectRoutes,
        openProjectTab,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname, search, locationKey],
  );

  if (pathname.startsWith("/onboarding")) {
    return (
      <OnboardingScreen
        entry={onboardingEntry}
        initialSiteId={onboardingSiteId}
        onCancel={() => navigate("/")}
        onFinish={() => navigate(onboardingEntry === "add-auth" || onboardingEntry === "add-site" ? "/" : projectRouteByNav.overview)}
        onMockAction={showMockAction}
      />
    );
  }

  return (
    <div className="canvas">
      <div className={pathname.endsWith("/scan/confirm") ? "modal-host" : "app-host"}>
        <AppShell
          projectName={activeProject.projectName}
          tabs={visibleTabs}
          activeTabId={activeTabId}
          activeNav={activeNav}
          menus={menus}
          variant={shellVariant}
          onNewTab={() => navigate("/new-tab")}
          onCloseTab={closeProjectTab}
          onSelectTab={(id) => {
            if (id === "home") {
              navigate("/");
              return;
            }
            openProjectTab(id, activeNav);
          }}
          onNavigate={(key: NavKey) => navigate(projectRouteByNavForProject(activeProject.projectId)[key])}
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
              onCancel={() => navigate(projectRoutes.scan)}
              onTertiary={() => navigate(`${projectRoutes.scan}/run`)}
              onConfirm={() => navigate(`${projectRoutes.scan}/run`)}
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
  activeProject: SiteWorkspaceModel,
  hasActiveProjectTab: boolean,
): TopMenuModel[] {
  const activeProjectRoutes = projectRouteByNavForProject(activeProject.projectId);
  const activeProjectCommand = (label: string, onSelect: () => void, shortcut?: string) => ({
    label,
    shortcut,
    disabled: !hasActiveProjectTab,
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
        { label: "Connected sites", onSelect: () => navigate("/home/sites") },
        { label: "Add connected site", onSelect: () => navigate(onboardingPath("add-site")) },
        activeProjectCommand(`Use active site in new project · ${activeProject.name}`, () => navigate(onboardingPath("new-project", activeProject.siteId))),
        activeProjectCommand(`Active project overview · ${activeProject.projectName}`, () => navigate(activeProjectRoutes.overview)),
        activeProjectCommand("Active project apps", () => navigate(activeProjectRoutes.apps)),
        activeProjectCommand("Active project settings", () => navigate(activeProjectRoutes.settings)),
      ],
    },
    {
      label: "Scan",
      items: [
        activeProjectCommand("Open scan setup", () => navigate(activeProjectRoutes.scan)),
        activeProjectCommand("Configure sensitive options", () => navigate(`${activeProjectRoutes.scan}/advanced`)),
        activeProjectCommand("Open scan progress", () => navigate(`${activeProjectRoutes.scan}/run`)),
      ],
    },
    {
      label: "Snapshot",
      items: [
        activeProjectCommand("Active project Local Snapshot", () => navigate(activeProjectRoutes.snapshot)),
        activeProjectCommand("Active project reports", () => navigate(activeProjectRoutes.reports)),
        activeProjectCommand("Active project developer files", () => navigate(activeProjectRoutes["developer-files"])),
        activeProjectCommand("Active project history", () => navigate(activeProjectRoutes.history)),
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
  activeProject,
  projectRoutes,
  openProjectTab,
}: {
  pathname: string;
  search: string;
  navigate: (path: string) => void;
  onMockAction: MockActionHandler;
  activeProject: SiteWorkspaceModel;
  projectRoutes: Record<NavKey, string>;
  openProjectTab: (id: string, nav?: NavKey) => void;
}) {
  if (pathname === "/" || pathname === "/home/accounts" || pathname === "/home/sites") {
    const requestedAuthTest = new URLSearchParams(search).get("test");
    return (
      <ProjectHomeScreen
        onAddProfile={() => navigate(onboardingPath("add-auth"))}
        onAddSite={() => navigate(onboardingPath("add-site"))}
        onNewProject={() => navigate(onboardingPath("new-project"))}
        onUseSiteInNewProject={(id) => navigate(onboardingPath("new-project", id))}
        onOpenProject={(id) => openProjectTab(id, "overview")}
        onMockAction={onMockAction}
        requestedAuthTest={requestedAuthTest}
        requestedAuthTestKey={search}
      />
    );
  }

  if (pathname === "/new-tab") {
    return (
      <NewTabScreen
        onAddSite={() => navigate(onboardingPath("add-site"))}
        onNewProject={() => navigate(onboardingPath("new-project"))}
        onOpenProject={() => openProjectTab(projectId, "overview")}
      />
    );
  }

  if (pathname.endsWith("/apps")) {
    return <AppsScreen site={activeProject} onContinue={() => navigate(projectRoutes.scan)} onMockAction={onMockAction} />;
  }

  if (pathname.endsWith("/scan/advanced") || pathname.endsWith("/scan/confirm")) {
    return <SensitiveOptionsScreen site={activeProject} compact={pathname.endsWith("/scan/confirm")} onBack={() => navigate(projectRoutes.scan)} onConfirm={() => navigate(`${projectRoutes.scan}/confirm`)} />;
  }

  if (pathname.endsWith("/scan/run")) {
    const source = new URLSearchParams(search).get("source");
    return (
      <ScanRunningScreen
        source={source === "rerun" ? "rerun" : "new"}
        site={activeProject}
        onCancel={() => {
          onMockAction("Preview scan cancelled. No runner or snapshot was stopped because the runner is not connected yet.");
          navigate(projectRoutes.scan);
        }}
        onChangeSettings={() => navigate(projectRoutes.scan)}
      />
    );
  }

  if (pathname.endsWith("/scan/result")) {
    const params = new URLSearchParams(search);
    const mode = params.get("state") === "failed" ? "failed" : params.get("state") === "completed" ? "completed" : "warnings";
    return (
      <ScanResultScreen
        mode={mode}
        site={activeProject}
        onReports={() => navigate(projectRoutes.reports)}
        onSnapshot={() => navigate(projectRoutes.snapshot)}
        onDeveloperFiles={() => navigate(projectRoutes["developer-files"])}
        onRetry={() => navigate(projectRoutes.scan)}
        onFixConnection={() => navigate("/home/accounts")}
        onPartialSummary={() => navigate(projectRoutes.snapshot)}
        onMockAction={onMockAction}
      />
    );
  }

  if (pathname.endsWith("/scan")) {
    return <ScanSetupScreen site={activeProject} onAdvanced={() => navigate(`${projectRoutes.scan}/advanced`)} onStart={() => navigate(`${projectRoutes.scan}/run`)} onMockAction={onMockAction} />;
  }

  if (pathname.endsWith("/snapshot")) {
    return (
      <LocalSnapshotScreen
        site={activeProject}
        onChangeSettings={() => navigate(projectRoutes.scan)}
        onOpenFullScan={() => navigate(`${projectRoutes.scan}/run?source=rerun`)}
        onMockAction={onMockAction}
      />
    );
  }

  if (pathname.includes("/reports")) {
    return <ReportsScreen site={activeProject} onMockAction={onMockAction} />;
  }

  if (pathname.endsWith("/developer-files")) {
    return <DeveloperFilesScreen site={activeProject} onMockAction={onMockAction} />;
  }

  if (pathname.includes("/history")) {
    return <HistoryScreen site={activeProject} onMockAction={onMockAction} />;
  }

  if (pathname.endsWith("/settings")) {
    return <SettingsScreen site={activeProject} onMockAction={onMockAction} />;
  }

  if (pathname.endsWith("/advanced")) {
    return <AdvancedInternalDataScreen site={activeProject} />;
  }

  return (
    <SiteOverviewScreen
      site={activeProject}
      onScanSettings={() => navigate(projectRoutes.scan)}
      onOpenFullScan={() => navigate(`${projectRoutes.scan}/run`)}
      onSnapshot={() => navigate(projectRoutes.snapshot)}
      onReports={() => navigate(projectRoutes.reports)}
      onDeveloperFiles={() => navigate(projectRoutes["developer-files"])}
      onMockAction={onMockAction}
    />
  );
}
