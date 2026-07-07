import { useEffect, useMemo, useState } from "react";
import { AppShell, ConfirmationModal } from "./components";
import { tabs, tabsWithSandbox } from "./mockData";
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
import type { MockActionHandler, MockFeedbackTone, NavKey, TopMenuModel } from "./types";

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
  const activeTabId = activeTabFromPath(pathname);
  const shellVariant = isSiteRoute(pathname) ? "site" : "home";
  const visibleTabs = pathname === "/" || pathname.endsWith("/overview") ? tabsWithSandbox : tabs;
  const showMockAction: MockActionHandler = (message, options = {}) => {
    setMockFeedback({
      id: Date.now(),
      message,
      tone: options.tone ?? "info",
      sticky: options.sticky ?? options.tone === "err",
    });
  };
  const menus = buildTopMenus(navigate, showMockAction);
  const onboardingEntry = getOnboardingEntry(search);

  const screen = useMemo(
    () =>
      renderScreen({
        pathname,
        search,
        navigate,
        onMockAction: showMockAction,
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
          projectName="Client CRM Discovery"
          tabs={visibleTabs}
          activeTabId={activeTabId}
          activeNav={activeNav}
          menus={menus}
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

function buildTopMenus(navigate: (path: string) => void, onMockAction: MockActionHandler): TopMenuModel[] {
  return [
    {
      label: "Project",
      items: [
        { label: "Projects", shortcut: "Ctrl+1", onSelect: () => navigate("/") },
        { label: "New project", onSelect: () => navigate(onboardingPath("new-project")) },
        { label: "Open local folder", onSelect: () => onMockAction("Folder picker/open-folder bridge stub triggered. No folder was opened.") },
      ],
    },
    {
      label: "Account",
      items: [
        { label: "Auth profiles", onSelect: () => navigate("/home/accounts") },
        { label: "Add auth profile", onSelect: () => navigate(onboardingPath("add-auth")) },
        { label: "Test connection", onSelect: () => navigate(`/home/accounts?test=Production%20Admin&testAt=${Date.now()}`) },
      ],
    },
    {
      label: "Site",
      items: [
        { label: "Site workspaces", onSelect: () => navigate("/home/sites") },
        { label: "Add site workspace", onSelect: () => navigate(onboardingPath("add-site")) },
        { label: "Open Client A Production", onSelect: () => navigate(siteRouteByNav.overview) },
        { label: "Apps", onSelect: () => navigate(siteRouteByNav.apps) },
        { label: "Settings", onSelect: () => navigate(siteRouteByNav.settings) },
      ],
    },
    {
      label: "Scan",
      items: [
        { label: "Choose scan preset", onSelect: () => navigate(siteRouteByNav.scan) },
        { label: "Configure sensitive options", onSelect: () => navigate(`${siteRouteByNav.scan}/advanced`) },
        { label: "Run scan", onSelect: () => navigate(`${siteRouteByNav.scan}/run`) },
      ],
    },
    {
      label: "Snapshot",
      items: [
        { label: "Local Snapshot", onSelect: () => navigate(siteRouteByNav.snapshot) },
        { label: "Reports", onSelect: () => navigate(siteRouteByNav.reports) },
        { label: "Developer Files", onSelect: () => navigate(siteRouteByNav["developer-files"]) },
        { label: "History", onSelect: () => navigate(siteRouteByNav.history) },
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
          onSelect: () => onMockAction("Kintone Site Discovery · MVP 1 desktop mock shell."),
        },
        { label: "Documentation", onSelect: () => onMockAction("Documentation link is a placeholder in this desktop mock.") },
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
}: {
  pathname: string;
  search: string;
  navigate: (path: string) => void;
  onMockAction: MockActionHandler;
}) {
  if (pathname === "/" || pathname === "/home/accounts" || pathname === "/home/sites") {
    const requestedAuthTest = new URLSearchParams(search).get("test");
    return (
      <ProjectHomeScreen
        onAddProfile={() => navigate(onboardingPath("add-auth"))}
        onAddSite={() => navigate(onboardingPath("add-site"))}
        onNewProject={() => navigate(onboardingPath("new-project"))}
        onOpenSite={() => navigate(siteRouteByNav.overview)}
        onMockAction={onMockAction}
        requestedAuthTest={requestedAuthTest}
        requestedAuthTestKey={search}
      />
    );
  }

  if (pathname === "/new-tab") {
    return <NewTabScreen onAddSite={() => navigate(onboardingPath("add-site"))} onOpenSite={() => navigate(siteRouteByNav.overview)} />;
  }

  if (pathname.endsWith("/apps")) {
    return <AppsScreen onContinue={() => navigate(siteRouteByNav.scan)} onMockAction={onMockAction} />;
  }

  if (pathname.endsWith("/scan/advanced") || pathname.endsWith("/scan/confirm")) {
    return <SensitiveOptionsScreen compact={pathname.endsWith("/scan/confirm")} onBack={() => navigate(siteRouteByNav.scan)} onConfirm={() => navigate(`${siteRouteByNav.scan}/confirm`)} />;
  }

  if (pathname.endsWith("/scan/run")) {
    const source = new URLSearchParams(search).get("source");
    return (
      <ScanRunningScreen
        source={source === "rerun" ? "rerun" : "new"}
        onCancel={() => {
          onMockAction("Mock scan cancelled. No runner or snapshot was stopped because the runner is not wired yet.");
          navigate(siteRouteByNav.scan);
        }}
        onChangeSettings={() => navigate(siteRouteByNav.scan)}
      />
    );
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
        onFixConnection={() => navigate("/home/accounts")}
        onPartialSummary={() => navigate(siteRouteByNav.snapshot)}
        onMockAction={onMockAction}
      />
    );
  }

  if (pathname.endsWith("/scan")) {
    return <ScanSetupScreen onAdvanced={() => navigate(`${siteRouteByNav.scan}/advanced`)} onStart={() => navigate(`${siteRouteByNav.scan}/run`)} onMockAction={onMockAction} />;
  }

  if (pathname.endsWith("/snapshot")) {
    return <LocalSnapshotScreen onRunScan={() => navigate(`${siteRouteByNav.scan}/run?source=rerun`)} onMockAction={onMockAction} />;
  }

  if (pathname.includes("/reports")) {
    return <ReportsScreen onMockAction={onMockAction} />;
  }

  if (pathname.endsWith("/developer-files")) {
    return <DeveloperFilesScreen onMockAction={onMockAction} />;
  }

  if (pathname.includes("/history")) {
    return <HistoryScreen onReports={() => navigate(siteRouteByNav.reports)} onDeveloperFiles={() => navigate(siteRouteByNav["developer-files"])} onMockAction={onMockAction} />;
  }

  if (pathname.endsWith("/settings")) {
    return <SettingsScreen onMockAction={onMockAction} />;
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
      onMockAction={onMockAction}
    />
  );
}
