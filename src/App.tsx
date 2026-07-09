import { useEffect, useMemo, useState } from "react";
import { AppShell, ConfirmationModal } from "./components";
import {
  additionalOptions,
  authProfileIdForSelection,
  authProfileModelFromDomain,
  connectedSiteModelFromDomain,
  connectedSites,
  getAuthProfileById,
  getConnectedSiteById,
  projectContext,
  projectModelFromDomain,
  projectRows as mockProjectRows,
  profiles,
} from "./mockData";
import { activeTabFromPath, isProjectRoute, navFromPath, projectIdFromPath, projectRouteByNavForProject, projectRouteIdFromPath } from "./router/routes";
import { defaultSelectedAppIds, mockAppSummaries } from "./appPickerData";
import { AdvancedInternalDataScreen } from "./screens/AdvancedInternalDataScreen";
import { AppsScreen } from "./screens/AppsScreen";
import { DeveloperFilesScreen } from "./screens/DeveloperFilesScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { LocalSnapshotScreen } from "./screens/LocalSnapshotScreen";
import { NewTabScreen } from "./screens/NewTabScreen";
import { OnboardingScreen, type OnboardingFinishDraft, type OnboardingFinishResult } from "./screens/onboarding/OnboardingScreen";
import { ProjectHomeScreen } from "./screens/ProjectHomeScreen";
import { ReportsScreen } from "./screens/ReportsScreen";
import { ScanResultScreen } from "./screens/ScanResultScreen";
import { ScanRunningScreen } from "./screens/ScanRunningScreen";
import { ScanSetupScreen } from "./screens/ScanSetupScreen";
import { SensitiveOptionsScreen } from "./screens/SensitiveOptionsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { SiteOverviewScreen } from "./screens/SiteOverviewScreen";
import { getPlatformBridge } from "./platform";
import { createLocalId, evaluateScanRouteGuard, hasArmedSensitiveOptions, turnOffSensitiveOptions } from "@kintone-site-discovery/core";
import type { AppSummary, AuthProfile, ConnectedSite, Project } from "@kintone-site-discovery/core";
import type {
  AuthProfileModel,
  ConnectedSiteModel,
  MockActionHandler,
  MockFeedbackOptions,
  MockFeedbackTone,
  NavKey,
  ProjectContextModel,
  ProjectModel,
  SensitiveOption,
  SiteWorkspaceModel,
  TabModel,
  TopMenuModel,
} from "./types";
import type { WorkspaceHomeSnapshot, WorkspaceMetadataIssue } from "./platform";

type OnboardingEntry = "new-project" | "add-site" | "add-auth";
type WorkspaceMode = "loading" | "desktop_metadata" | "browser_fallback" | "empty";
type AppListSource = "persisted" | "sample";
const ONBOARDING_FINISH_VISIBLE_MS = 900;

function onboardingFailureResult(message: string, step: NonNullable<OnboardingFinishResult["step"]>, field: string): OnboardingFinishResult {
  return {
    ok: false,
    message,
    step,
    issues: [{ step, field, message }],
  };
}

function onboardingSystemFailureResult(message: string, step: NonNullable<OnboardingFinishResult["step"]>): OnboardingFinishResult {
  return {
    ok: false,
    message,
    step,
    issues: [],
  };
}

function projectOnboardingFailureResult(message: string, errors?: WorkspaceMetadataIssue[]): OnboardingFinishResult {
  const details = `${message} ${(errors ?? []).map((issue) => `${issue.path ?? ""} ${issue.message}`).join(" ")}`.toLowerCase();
  const isUserFixableProjectInput =
    details.includes("project.json") ||
    details.includes("folder") ||
    details.includes("path") ||
    (errors ?? []).some((issue) => issue.code === "invalid_metadata" && issue.recoverable);

  if (!isUserFixableProjectInput) {
    return onboardingSystemFailureResult(message, "project");
  }

  const field = details.includes("site")
    ? "selectedSiteId"
    : details.includes("auth")
      ? "selectedAuthProfileId"
      : details.includes("name")
        ? "projectName"
        : "projectFolderPath";
  return onboardingFailureResult(message, "project", field);
}

interface MockFeedbackState {
  id: number;
  message: string;
  tone: MockFeedbackTone;
  sticky: boolean;
}

interface RemovedMetadataIds {
  projects: string[];
  sites: string[];
  authProfiles: string[];
}

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function onboardingPath(entry: OnboardingEntry, preselectedSiteId?: string) {
  const params = new URLSearchParams({ entry });
  if (preselectedSiteId) {
    params.set("site", preselectedSiteId);
  }

  return `/onboarding?${params.toString()}`;
}

export function App() {
  const platform = useMemo(() => getPlatformBridge(), []);
  const [locationKey, setLocationKey] = useState(0);
  const [mockFeedback, setMockFeedback] = useState<MockFeedbackState | null>(null);
  const [openProjectTabIds, setOpenProjectTabIds] = useState<string[]>([]);
  const [workspaceHome, setWorkspaceHome] = useState<WorkspaceHomeSnapshot | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("loading");
  const [removedMetadataIds, setRemovedMetadataIds] = useState<RemovedMetadataIds>({ projects: [], sites: [], authProfiles: [] });
  const [selectedAppIdsByProject, setSelectedAppIdsByProject] = useState<Record<string, string[]>>({});
  const [sensitiveOptionsByProject, setSensitiveOptionsByProject] = useState<Record<string, SensitiveOption[]>>({});
  const [appsGuardMessage, setAppsGuardMessage] = useState<string | null>(null);
  const [windowStateRestored, setWindowStateRestored] = useState(false);
  const pathname = window.location.pathname;
  const search = window.location.search;
  const workspaceView = useMemo(() => applyRemovedMetadataIds(buildWorkspaceView(workspaceHome, workspaceMode), removedMetadataIds), [removedMetadataIds, workspaceHome, workspaceMode]);

  useEffect(() => {
    const onPopState = () => setLocationKey((key) => key + 1);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      const [runtimeInfo, home, restoredWindowState] = await Promise.all([platform.getRuntimeInfo(), platform.getWorkspaceHome(), platform.getWindowState()]);
      if (cancelled) {
        return;
      }

      const nextMode: WorkspaceMode =
        runtimeInfo.runtime === "browser" || runtimeInfo.bridgeStatus === "fallback"
          ? "browser_fallback"
          : home.projects.length === 0 && home.connectedSites.length === 0 && home.authProfiles.length === 0
            ? "empty"
            : "desktop_metadata";
      setWorkspaceHome(home);
      setWorkspaceMode(nextMode);
      setSelectedAppIdsByProject(selectedAppIdsFromWorkspaceHome(home));
      if (restoredWindowState.restored && restoredWindowState.openProjectTabs.length > 0) {
        const restoredProjectIds = restoredWindowState.openProjectTabs.map((tab) => tab.projectId ?? tab.id).filter((id): id is string => Boolean(id));
        setOpenProjectTabIds(restoredProjectIds);
        setWindowStateRestored(true);
        const activeRoute = restoredWindowState.openProjectTabs.find((tab) => tab.id === restoredWindowState.activeTabId)?.routePath;
        if (activeRoute && window.location.pathname === "/") {
          window.history.replaceState({}, "", activeRoute);
          setLocationKey((key) => key + 1);
        }
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [platform]);

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
    const guardedPath = applyRouteGuard(path);
    window.history.pushState({}, "", guardedPath);
    setLocationKey((key) => key + 1);
  };

  const activeNav = navFromPath(pathname);
  const activeProjectId = projectRouteIdFromPath(pathname) ?? projectIdFromPath(pathname);
  const allowMockFallback = workspaceMode === "browser_fallback";
  const activeProjectBase = getWorkspaceProjectContext(activeProjectId, workspaceView, allowMockFallback);
  const selectedAppIds = selectedAppIdsForProject(activeProjectBase.projectId, selectedAppIdsByProject, activeProjectBase.selectedApps);
  const canStartScan = selectedAppIds.length > 0;
  const activeProject = { ...activeProjectBase, selectedApps: selectedAppIds.length };
  const projectRoutes = projectRouteByNavForProject(activeProject.projectId);
  const activeTabId = activeTabFromPath(pathname);
  const shellVariant = isProjectRoute(pathname) ? "site" : "home";
  const sensitiveOptions = sensitiveOptionsForProject(activeProject.projectId, sensitiveOptionsByProject);
  const armedSensitiveOptions = sensitiveOptions.filter((option) => option.value && option.sensitive);
  const armedSensitiveSignature = armedSensitiveOptions.map((option) => option.key).join("|");
  const visibleTabs = tabsForWorkspaceProjects(openProjectTabIds, workspaceView);
  const activeProjectApps = appsForProject(activeProject.projectId, workspaceHome, workspaceMode);
  const showMockAction: MockActionHandler = (message, options = {}) => {
    setMockFeedback({
      id: Date.now(),
      message,
      tone: options.tone ?? "info",
      sticky: options.sticky ?? options.tone === "err",
    });
  };
  const openProjectTab = (id: string, nav: NavKey = "overview") => {
    const project = getWorkspaceProjectContext(id, workspaceView);
    setOpenProjectTabIds((current) => (current.includes(project.projectId) ? current : [...current, project.projectId]));
    navigate(projectRouteByNavForProject(project.projectId)[nav]);
  };

  const closeProjectTab = (id: string) => {
    setOpenProjectTabIds((current) => current.filter((tabId) => tabId !== id));
    if (id === activeTabId) {
      navigate("/");
    }
  };

  const onboardingEntry = getOnboardingEntry(search);
  const onboardingSiteId = new URLSearchParams(search).get("site");
  const defaultProjectsRoot = workspaceHome?.defaultProjectsRoot ?? "C:\\tmp\\Kintone Site Discovery\\Projects";

  async function handleOnboardingFinish(draft: OnboardingFinishDraft): Promise<OnboardingFinishResult> {
    if (draft.entry === "new-project" && draft.project) {
      const site = domainConnectedSiteForId(draft.project.selectedSiteId, workspaceHome);
      const authProfile = draft.project.selectedAuthProfileId ? domainAuthProfileForId(draft.project.selectedAuthProfileId, workspaceHome) : undefined;
      const result = await platform.createProject({
        name: draft.project.name,
        folderPath: draft.project.folderPath,
        connectedSite: site,
        authSelection: draft.project.authSelection,
        authProfile,
        appSummaries: appSummariesForIds(draft.project.selectedAppIds),
      });

      if (!result.ok || !result.project) {
        const message = result.message ?? "Project metadata could not be saved.";
        await delay(ONBOARDING_FINISH_VISIBLE_MS);
        showMockAction(message, { tone: "err", sticky: true });
        return projectOnboardingFailureResult(message, result.errors);
      }

      const createdProject = result.project;
      setWorkspaceHome(await platform.getWorkspaceHome());
      setSelectedAppIdsByProject((current) => ({ ...current, [createdProject.id]: draft.project?.selectedAppIds ?? [] }));
      setOpenProjectTabIds((current) => (current.includes(createdProject.id) ? current : [...current, createdProject.id]));
      showMockAction("Project metadata was saved locally. No kintone request or snapshot write happened.", { tone: "ok" });
      await delay(ONBOARDING_FINISH_VISIBLE_MS);
      navigate(projectRouteByNavForProject(createdProject.id).overview);
      return { ok: true };
    }

    if (draft.entry === "add-site" && draft.connectedSite) {
      const site = domainConnectedSiteFromDraft(draft.connectedSite);
      const result = await platform.saveConnectedSite(site);
      setWorkspaceHome(await platform.getWorkspaceHome());
      const message = result.ok ? "Connected site metadata saved locally." : result.message;
      if (!result.ok) {
        await delay(ONBOARDING_FINISH_VISIBLE_MS);
        showMockAction(message, { tone: "err", sticky: true });
        const field = /name|display/i.test(message) ? "siteDisplayName" : "siteDomain";
        return onboardingFailureResult(message, "site", field);
      }
      showMockAction(message, { tone: "ok" });
      await delay(ONBOARDING_FINISH_VISIBLE_MS);
      navigate("/");
      return { ok: true };
    }

    if (draft.entry === "add-auth" && draft.authProfile) {
      const profile = domainAuthProfileFromDraft(draft.authProfile);
      const result = await platform.saveAuthProfile(profile);
      setWorkspaceHome(await platform.getWorkspaceHome());
      const message = result.ok ? "Auth profile metadata saved locally. No password was written to metadata." : result.message;
      if (!result.ok) {
        await delay(ONBOARDING_FINISH_VISIBLE_MS);
        showMockAction(message, { tone: "err", sticky: true });
        const field = /user|email/i.test(message) ? "authUsername" : "authProfileDisplayName";
        return onboardingFailureResult(message, "auth", field);
      }
      showMockAction(message, { tone: "ok" });
      await delay(ONBOARDING_FINISH_VISIBLE_MS);
      navigate("/");
      return { ok: true };
    }

    const message = "Setup could not finish because the wizard draft was incomplete.";
    await delay(ONBOARDING_FINISH_VISIBLE_MS);
    showMockAction(message, { tone: "err", sticky: true });
    if (draft.entry === "add-auth") {
      return onboardingFailureResult(message, "auth", "authProfileDisplayName");
    }
    if (draft.entry === "add-site") {
      return onboardingFailureResult(message, "site", "siteDomain");
    }
    return onboardingFailureResult(message, "project", "projectName");
  }

  async function handleOpenProjectFromFolder() {
    const result = await platform.openProjectFromFolder();
    if (!result.ok || !result.project) {
      showMockAction(result.message ?? "Project folder could not be opened.", { tone: "err", sticky: true });
      return;
    }

    const openedProject = result.project;
    setWorkspaceHome(await platform.getWorkspaceHome());
    setOpenProjectTabIds((current) => (current.includes(openedProject.id) ? current : [...current, openedProject.id]));
    showMockAction("Project metadata opened from local folder.", { tone: "ok" });
    navigate(projectRouteByNavForProject(openedProject.id).overview);
  }

  async function handleOpenActiveProjectFolder() {
    const result = await platform.openLocalFolder({ path: activeProject.projectPath });
    showMockAction(...feedbackForResult(result));
  }

  async function refreshWorkspaceHome() {
    const home = await platform.getWorkspaceHome();
    setWorkspaceHome(home);
    return home;
  }

  async function handleOpenProjectFolderById(projectIdValue: string) {
    const project = workspaceView.projects.find((item) => item.id === projectIdValue);
    if (!project) {
      showMockAction("Project metadata was not found.", { tone: "err", sticky: true });
      return;
    }
    const result = await platform.openLocalFolder({ path: project.path });
    showMockAction(...feedbackForResult(result));
  }

  async function handleUpdateProjectMetadata(projectIdValue: string, draft: { name: string; siteId: string; authSelection: Project["authSelection"] }) {
    const currentProject = workspaceHome?.projects.find((project) => project.id === projectIdValue);
    if (!currentProject) {
      showMockAction("Project metadata was not found.", { tone: "err", sticky: true });
      return;
    }

    const result = await platform.updateProjectMetadata({
      projectId: projectIdValue,
      name: draft.name,
      siteId: draft.siteId,
      authSelection: draft.authSelection,
    });
    await refreshWorkspaceHome();
    showMockAction(...feedbackForResult(result));
  }

  async function handleRemoveProjectFromHome(projectIdValue: string) {
    setRemovedMetadataIds((current) => addRemovedMetadataId(current, "projects", projectIdValue));
    const result = await platform.removeProjectFromApp({ projectId: projectIdValue });
    if (result.ok) {
      const home = await platform.getWorkspaceHome();
      setWorkspaceHome(pruneProjectFromWorkspaceHome(home, projectIdValue));
      setOpenProjectTabIds((current) => current.filter((id) => id !== projectIdValue));
      if (activeTabId === projectIdValue) {
        navigate("/");
      }
    } else {
      await refreshWorkspaceHome();
      if (shouldRestoreRemovedMetadata(result.code)) {
        setRemovedMetadataIds((current) => removeRemovedMetadataId(current, "projects", projectIdValue));
      }
    }
    showMockAction(...removeFeedbackForResult(result));
  }

  async function handleUpdateConnectedSite(siteIdValue: string, draft: { displayName: string; domain: string }) {
    const currentSite = workspaceHome?.connectedSites.find((site) => site.id === siteIdValue);
    if (!currentSite) {
      showMockAction("Connected site metadata was not found.", { tone: "err", sticky: true });
      return;
    }
    const result = await platform.updateConnectedSite({ ...currentSite, displayName: draft.displayName, domain: draft.domain });
    await refreshWorkspaceHome();
    showMockAction(...removeFeedbackForResult(result));
  }

  async function handleRemoveConnectedSite(siteIdValue: string) {
    setRemovedMetadataIds((current) => addRemovedMetadataId(current, "sites", siteIdValue));
    const result = await platform.removeConnectedSite({ siteId: siteIdValue });
    if (result.ok) {
      const home = await platform.getWorkspaceHome();
      setWorkspaceHome(pruneConnectedSiteFromWorkspaceHome(home, siteIdValue));
    } else {
      await refreshWorkspaceHome();
      if (shouldRestoreRemovedMetadata(result.code)) {
        setRemovedMetadataIds((current) => removeRemovedMetadataId(current, "sites", siteIdValue));
      }
    }
    showMockAction(...removeFeedbackForResult(result));
  }

  async function handleUpdateAuthProfile(authProfileIdValue: string, draft: { displayName: string; username: string; credentialUpdated?: boolean }) {
    const currentProfile = workspaceHome?.authProfiles.find((profile) => profile.id === authProfileIdValue);
    if (!currentProfile) {
      showMockAction("Auth profile metadata was not found.", { tone: "err", sticky: true });
      return;
    }
    const result = await platform.updateAuthProfile({
      ...currentProfile,
      displayName: draft.displayName,
      username: draft.username,
      credentialStatus: draft.credentialUpdated ? "saved" : currentProfile.credentialStatus,
    });
    await refreshWorkspaceHome();
    showMockAction(draft.credentialUpdated && result.ok ? "Auth profile updated. Password was accepted as write-only preview input and was not saved to metadata." : result.message, {
      tone: result.ok ? "ok" : "err",
      sticky: !result.ok,
    });
  }

  async function handleRemoveAuthProfile(authProfileIdValue: string) {
    setRemovedMetadataIds((current) => addRemovedMetadataId(current, "authProfiles", authProfileIdValue));
    const result = await platform.removeAuthProfile({ authProfileId: authProfileIdValue });
    if (result.ok) {
      const home = await platform.getWorkspaceHome();
      setWorkspaceHome(pruneAuthProfileFromWorkspaceHome(home, authProfileIdValue));
    } else {
      await refreshWorkspaceHome();
      if (shouldRestoreRemovedMetadata(result.code)) {
        setRemovedMetadataIds((current) => removeRemovedMetadataId(current, "authProfiles", authProfileIdValue));
      }
    }
    showMockAction(result.message, { tone: result.ok ? "ok" : "err", sticky: !result.ok });
  }

  const menus = buildTopMenus(
    navigate,
    showMockAction,
    activeProject,
    shellVariant === "site",
    workspaceView.projects,
    openProjectTab,
    handleOpenProjectFromFolder,
    handleOpenActiveProjectFolder,
  );

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
        onOpenProjectFromFolder: handleOpenProjectFromFolder,
        onOpenProjectFolder: handleOpenActiveProjectFolder,
        workspaceView,
        workspaceMode,
        activeProjectApps,
        selectedAppIds,
        canStartScan,
        onSelectedAppIdsChange: (nextSelectedAppIds) =>
          setSelectedAppIdsByProject((current) => ({
            ...current,
            [activeProject.projectId]: nextSelectedAppIds,
          })),
        sensitiveOptions,
        onSensitiveOptionsChange: (nextOptions) =>
          setSensitiveOptionsByProject((current) => ({
            ...current,
            [activeProject.projectId]: nextOptions,
          })),
        appsGuardMessage,
        clearAppsGuardMessage: () => setAppsGuardMessage(null),
        onOpenProjectFolderById: handleOpenProjectFolderById,
        onUpdateProjectMetadata: handleUpdateProjectMetadata,
        onRemoveProjectFromHome: handleRemoveProjectFromHome,
        onUpdateConnectedSite: handleUpdateConnectedSite,
        onRemoveConnectedSite: handleRemoveConnectedSite,
        onUpdateAuthProfile: handleUpdateAuthProfile,
        onRemoveAuthProfile: handleRemoveAuthProfile,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname, search, locationKey, workspaceView, workspaceMode, activeProjectApps, selectedAppIds, canStartScan, sensitiveOptions, appsGuardMessage, workspaceHome],
  );

  useEffect(() => {
    const guard = evaluateScanRouteGuard({
      routePath: pathname,
      selectedAppIds,
      armedSensitiveOptions: armedSensitiveOptions.map((option) => ({
        categoryKey: option.key,
        label: option.label,
        enabled: true,
        meta: option.meta,
      })),
      appsRoutePath: projectRoutes.apps,
      scanRoutePath: projectRoutes.scan,
      runRoutePath: `${projectRoutes.scan}/run`,
    });

    if (!guard.ok) {
      if (guard.reason === "no_selected_apps") {
        showMockAction("Choose at least one app before starting a scan.", { tone: "warn" });
      }
      window.history.replaceState({}, "", guard.redirectTo);
      setLocationKey((key) => key + 1);
    }
  }, [pathname, selectedAppIds, armedSensitiveSignature, projectRoutes.apps, projectRoutes.scan]);

  useEffect(() => {
    if (!windowStateRestored && openProjectTabIds.length === 0) {
      return;
    }

    const tabs = tabsForWorkspaceProjects(openProjectTabIds, workspaceView).filter((tab) => tab.kind === "project");
    void platform.saveWindowState({
      openProjectTabs: tabs.map((tab) => ({
        id: tab.id,
        title: tab.title,
        projectId: tab.id,
        routePath: tab.id === activeTabId ? pathname : projectRouteByNavForProject(tab.id).overview,
      })),
      activeTabId,
      restored: true,
    });
  }, [activeTabId, openProjectTabIds, pathname, platform, windowStateRestored, workspaceView]);

  function applyRouteGuard(path: string) {
    const routeProjectId = projectRouteIdFromPath(path) ?? activeProject.projectId;
    const routeProjectContext = getWorkspaceProjectContext(routeProjectId, workspaceView, allowMockFallback);
    const routeProjectRoutes = projectRouteByNavForProject(routeProjectContext.projectId);
    const routeSelectedAppIds = selectedAppIdsForProject(routeProjectContext.projectId, selectedAppIdsByProject, routeProjectContext.selectedApps);
    const routeSensitiveOptions = sensitiveOptionsForProject(routeProjectId, sensitiveOptionsByProject);
    const routeArmedOptions = routeSensitiveOptions
      .filter((option) => option.value && option.sensitive)
      .map((option) => ({ categoryKey: option.key, label: option.label, enabled: true, meta: option.meta }));
    const guard = evaluateScanRouteGuard({
      routePath: path,
      selectedAppIds: routeSelectedAppIds,
      armedSensitiveOptions: routeArmedOptions,
      appsRoutePath: routeProjectRoutes.apps,
      scanRoutePath: routeProjectRoutes.scan,
      runRoutePath: `${routeProjectRoutes.scan}/run`,
    });

    if (!guard.ok) {
      if (guard.reason === "no_selected_apps") {
        showMockAction("Choose at least one app before starting a scan.", { tone: "warn" });
      }
      return guard.redirectTo;
    }

    return path;
  }

  if (pathname.startsWith("/onboarding")) {
    return (
      <>
        <OnboardingScreen
          entry={onboardingEntry}
          initialSiteId={onboardingSiteId}
          defaultProjectsRoot={defaultProjectsRoot}
          onCancel={() => navigate("/")}
          onFinish={handleOnboardingFinish}
          onMockAction={showMockAction}
          connectedSites={workspaceHome?.connectedSites ?? []}
          authProfiles={workspaceHome?.authProfiles ?? []}
          workspaceMode={workspaceMode}
        />
        {mockFeedback ? <MockToast feedback={mockFeedback} onDismiss={() => setMockFeedback(null)} /> : null}
      </>
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
              body={
                canStartScan
                  ? "This scan will capture data that may include proprietary code or personal information. It stays local and redacted."
                  : "Sensitive options can be reviewed now, but choose at least one app before starting the scan."
              }
              items={armedSensitiveOptions.map((option) => option.label)}
              requireAck
              ackLabel="I understand these outputs may contain sensitive data."
              confirmLabel="Confirm & start scan"
              cancelLabel="Cancel"
              tertiaryLabel="Turn these off"
              tone="warn"
              confirmDisabled={!canStartScan}
              onCancel={() => navigate(projectRoutes.scan)}
              onTertiary={() => {
                setSensitiveOptionsByProject((current) => ({
                  ...current,
                  [activeProject.projectId]: turnOffSensitiveOptions(sensitiveOptions.map((option) => ({ categoryKey: option.key, label: option.label, enabled: option.value, meta: option.meta }))).map(
                    (option) => ({
                      key: option.categoryKey,
                      label: option.label,
                      tier: "additional" as const,
                      value: option.enabled,
                      sensitive: true,
                      meta: option.meta,
                    }),
                  ),
                }));
                navigate(canStartScan ? `${projectRoutes.scan}/run` : projectRoutes.scan);
              }}
              onConfirm={() => {
                if (canStartScan) {
                  navigate(`${projectRoutes.scan}/run`);
                }
              }}
            />
          </div>
        ) : null}
        {mockFeedback ? <MockToast feedback={mockFeedback} onDismiss={() => setMockFeedback(null)} /> : null}
      </div>
    </div>
  );
}

function MockToast({ feedback, onDismiss }: { feedback: MockFeedbackState; onDismiss: () => void }) {
  return (
    <div className={`mock-toast mock-toast--${feedback.tone}`} role={feedback.tone === "err" ? "alert" : "status"} aria-live="polite">
      <span>{feedback.message}</span>
      <button type="button" aria-label="Dismiss message" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}

interface WorkspaceViewModels {
  projects: ProjectModel[];
  connectedSites: ConnectedSiteModel[];
  profiles: AuthProfileModel[];
}

function buildWorkspaceView(home: WorkspaceHomeSnapshot | null, mode: WorkspaceMode): WorkspaceViewModels {
  if (mode === "loading") {
    return {
      projects: [],
      connectedSites: [],
      profiles: [],
    };
  }

  if (mode === "browser_fallback") {
    return {
      projects: mockProjectRows,
      connectedSites,
      profiles,
    };
  }

  if (!home) {
    return {
      projects: [],
      connectedSites: [],
      profiles: [],
    };
  }

  const domainSites = home.connectedSites;
  const domainProfiles = home.authProfiles;
  return {
    projects: home.projects.map((project) =>
      projectModelFromDomain(
        project,
        domainSites.find((site) => site.id === project.siteId),
        domainProfiles.find((profile) => profile.id === authProfileIdForSelection(project.authSelection)),
        home.projectAppListsByProjectId[project.id],
      ),
    ),
    connectedSites: domainSites.map(connectedSiteModelFromDomain),
    profiles: domainProfiles.map(authProfileModelFromDomain),
  };
}

function applyRemovedMetadataIds(view: WorkspaceViewModels, removedIds: RemovedMetadataIds): WorkspaceViewModels {
  const removedProjectIds = new Set(removedIds.projects);
  const removedSiteIds = new Set(removedIds.sites);
  const removedAuthProfileIds = new Set(removedIds.authProfiles);
  return {
    projects: view.projects.filter((project) => !removedProjectIds.has(project.id)),
    connectedSites: view.connectedSites.filter((site) => !removedSiteIds.has(site.id)),
    profiles: view.profiles.filter((profile) => !removedAuthProfileIds.has(profile.id)),
  };
}

function addRemovedMetadataId(state: RemovedMetadataIds, key: keyof RemovedMetadataIds, id: string): RemovedMetadataIds {
  if (state[key].includes(id)) {
    return state;
  }

  return { ...state, [key]: [...state[key], id] };
}

function removeRemovedMetadataId(state: RemovedMetadataIds, key: keyof RemovedMetadataIds, id: string): RemovedMetadataIds {
  return { ...state, [key]: state[key].filter((item) => item !== id) };
}

function shouldRestoreRemovedMetadata(code: string) {
  return code === "CONFLICT" || code === "IO_ERROR";
}

function feedbackForResult(result: { ok: boolean; message: string }): [string, MockFeedbackOptions] {
  return [result.message, { tone: result.ok ? "ok" : "err", sticky: !result.ok }];
}

function removeFeedbackForResult(result: { ok: boolean; code: string; message: string }): [string, MockFeedbackOptions] {
  if (result.ok) {
    return [result.message, { tone: "ok" }];
  }

  if (shouldRestoreRemovedMetadata(result.code)) {
    return [result.message, { tone: "err", sticky: true }];
  }

  return [`${result.message} Removed from this view only.`, { tone: "warn" }];
}

function pruneProjectFromWorkspaceHome(home: WorkspaceHomeSnapshot, projectIdValue: string): WorkspaceHomeSnapshot {
  return {
    ...home,
    projects: home.projects.filter((project) => project.id !== projectIdValue),
    connectedSites: home.connectedSites.map((site) => ({
      ...site,
      linkedProjectIds: site.linkedProjectIds.filter((id) => id !== projectIdValue),
    })),
    authProfiles: home.authProfiles.map((profile) => ({
      ...profile,
      linkedProjectIds: profile.linkedProjectIds.filter((id) => id !== projectIdValue),
    })),
  };
}

function pruneConnectedSiteFromWorkspaceHome(home: WorkspaceHomeSnapshot, siteIdValue: string): WorkspaceHomeSnapshot {
  return {
    ...home,
    connectedSites: home.connectedSites.filter((site) => site.id !== siteIdValue),
  };
}

function pruneAuthProfileFromWorkspaceHome(home: WorkspaceHomeSnapshot, authProfileIdValue: string): WorkspaceHomeSnapshot {
  return {
    ...home,
    authProfiles: home.authProfiles.filter((profile) => profile.id !== authProfileIdValue),
  };
}

function getWorkspaceProjectContext(id: string | null | undefined, view: WorkspaceViewModels, allowMockFallback = false): ProjectContextModel {
  const project = view.projects.find((item) => item.id === id) ?? view.projects.find((item) => item.siteId === id);
  if (!project) {
    return allowMockFallback ? projectContext(id) : emptyProjectContext(id);
  }

  const site = view.connectedSites.find((item) => item.id === project.siteId) ?? getConnectedSiteById(project.siteId);
  const authProfileId = authProfileIdForSelection(project.authSelection);
  const profile = view.profiles.find((item) => item.id === authProfileId) ?? getAuthProfileById(authProfileId);
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
    appsAvailable: project.appsAvailable || mockAppSummaries.length,
    pluginsCaptured: project.pluginsCaptured,
    redactions: project.redactions,
  };
}

function emptyProjectContext(id: string | null | undefined): ProjectContextModel {
  const projectIdValue = id ?? "no_project";
  return {
    id: projectIdValue,
    projectId: projectIdValue,
    projectName: "No project selected",
    projectPath: "",
    opened: "not opened",
    siteId: "no_site",
    name: "No connected site",
    domain: "",
    status: "No project",
    tone: "idle",
    meta: "Create or open a project to continue.",
    siteMeta: "No connected site selected",
    authSelection: { kind: "project_local", displayName: "No auth selected", username: "", authType: "password", credentialStatus: "no_credential" },
    profile: "No auth selected",
    profileUser: "",
    credentialStatus: "No credential",
    hasSnapshot: false,
    selectedApps: 0,
    appsAvailable: 0,
    pluginsCaptured: 0,
    redactions: 0,
  };
}

function tabsForWorkspaceProjects(projectIds: string[], view: WorkspaceViewModels): TabModel[] {
  if (view.projects.length === 0) {
    return [{ id: "home", title: "Home", kind: "home" }];
  }

  return [
    { id: "home", title: "Home", kind: "home" },
    ...projectIds.flatMap((id): TabModel[] => {
      const project = view.projects.find((item) => item.id === id);
      return project ? [{ id, title: project.name, kind: "project" }] : [];
    }),
  ];
}

function selectedAppIdsForProject(projectIdValue: string, selectedAppIdsByProject: Record<string, string[]>, fallbackSelectedAppCount = defaultSelectedAppIds.length): string[] {
  if (Object.prototype.hasOwnProperty.call(selectedAppIdsByProject, projectIdValue)) {
    return selectedAppIdsByProject[projectIdValue];
  }

  return fallbackSelectedAppCount > 0 ? defaultSelectedAppIds : [];
}

function selectedAppIdsFromWorkspaceHome(home: WorkspaceHomeSnapshot): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(home.projectAppListsByProjectId).map(([projectIdValue, appList]) => [projectIdValue, appList.apps.map((app) => app.id)]),
  );
}

function appsForProject(projectIdValue: string, home: WorkspaceHomeSnapshot | null, mode: WorkspaceMode): { apps: AppSummary[]; source: AppListSource } {
  const appList = home?.projectAppListsByProjectId[projectIdValue];
  if (appList && appList.apps.length > 0) {
    return { apps: appList.apps, source: "persisted" };
  }

  return {
    apps: mockAppSummaries,
    source: mode === "browser_fallback" ? "sample" : "sample",
  };
}

function sensitiveOptionsForProject(projectIdValue: string, sensitiveOptionsByProject: Record<string, SensitiveOption[]>): SensitiveOption[] {
  return sensitiveOptionsByProject[projectIdValue] ?? additionalOptions;
}

function domainConnectedSiteForId(id: string, home: WorkspaceHomeSnapshot | null): ConnectedSite {
  const persisted = home?.connectedSites.find((site) => site.id === id);
  if (persisted) {
    return persisted;
  }

  const mock = getConnectedSiteById(id);
  return {
    id: mock.id,
    displayName: mock.name,
    domain: mock.domain,
    savedStatus: "saved",
    linkedProjectIds: [],
    createdAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  };
}

function domainConnectedSiteFromDraft(draft: { displayName: string; domain: string }): ConnectedSite {
  return {
    id: createLocalId("site", draft.displayName || draft.domain),
    displayName: draft.displayName,
    domain: draft.domain,
    savedStatus: "saved",
    linkedProjectIds: [],
    createdAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  };
}

function domainAuthProfileForId(id: string, home: WorkspaceHomeSnapshot | null): AuthProfile | undefined {
  const persisted = home?.authProfiles.find((profile) => profile.id === id);
  if (persisted) {
    return persisted;
  }

  const mock = getAuthProfileById(id);
  return {
    id: mock.id,
    displayName: mock.name,
    username: mock.user,
    authType: "password",
    credentialStatus: mock.tone === "ok" ? "saved" : "needs_update",
    keychainRef: `keychain://pending/${mock.id}`,
    linkedProjectIds: [],
  };
}

function domainAuthProfileFromDraft(draft: { displayName: string; username: string }): AuthProfile {
  const id = createLocalId("auth", draft.displayName || draft.username);
  return {
    id,
    displayName: draft.displayName,
    username: draft.username,
    authType: "password",
    credentialStatus: "saved",
    keychainRef: `keychain://pending/${id}`,
    linkedProjectIds: [],
  };
}

function appSummariesForIds(ids: string[]): AppSummary[] {
  return mockAppSummaries
    .filter((app) => ids.includes(app.id))
    .map((app) => ({ ...app, captureStatus: "not_captured" as const }));
}

function buildTopMenus(
  navigate: (path: string) => void,
  onMockAction: MockActionHandler,
  activeProject: SiteWorkspaceModel,
  hasActiveProjectTab: boolean,
  recentProjects: ProjectModel[],
  openProjectTab: (id: string, nav?: NavKey) => void,
  onOpenProjectFromFolder: () => void,
  onOpenActiveProjectFolder: () => void,
): TopMenuModel[] {
  const activeProjectRoutes = projectRouteByNavForProject(activeProject.projectId);
  const recentProjectItems = recentProjects.slice(0, 10).map((project) => ({
    label: `${project.name} · ${project.path}`,
    onSelect: () => openProjectTab(project.id, "overview"),
  }));
  const activeProjectCommand = (label: string, onSelect: () => void, shortcut?: string, forceDisabled = false) => ({
    label,
    shortcut,
    disabled: !hasActiveProjectTab || forceDisabled,
    onSelect,
  });

  return [
    {
      label: "Project",
      items: [
        { label: "Projects", shortcut: "Ctrl+1", onSelect: () => navigate("/") },
        { label: "New project", onSelect: () => navigate(onboardingPath("new-project")) },
        { label: "Open recent project", disabled: recentProjectItems.length === 0, items: recentProjectItems },
        { label: "Open from folder...", onSelect: onOpenProjectFromFolder },
        activeProjectCommand("Open active project folder", onOpenActiveProjectFolder),
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
        activeProjectCommand("Open scan progress", () => navigate(`${activeProjectRoutes.scan}/run`), undefined, activeProject.selectedApps === 0),
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
  onOpenProjectFromFolder,
  onOpenProjectFolder,
  workspaceView,
  workspaceMode,
  activeProjectApps,
  selectedAppIds,
  canStartScan,
  onSelectedAppIdsChange,
  sensitiveOptions,
  onSensitiveOptionsChange,
  appsGuardMessage,
  clearAppsGuardMessage,
  onOpenProjectFolderById,
  onUpdateProjectMetadata,
  onRemoveProjectFromHome,
  onUpdateConnectedSite,
  onRemoveConnectedSite,
  onUpdateAuthProfile,
  onRemoveAuthProfile,
}: {
  pathname: string;
  search: string;
  navigate: (path: string) => void;
  onMockAction: MockActionHandler;
  activeProject: SiteWorkspaceModel;
  projectRoutes: Record<NavKey, string>;
  openProjectTab: (id: string, nav?: NavKey) => void;
  onOpenProjectFromFolder: () => void;
  onOpenProjectFolder: () => void;
  workspaceView: WorkspaceViewModels;
  workspaceMode: WorkspaceMode;
  activeProjectApps: { apps: AppSummary[]; source: AppListSource };
  selectedAppIds: string[];
  canStartScan: boolean;
  onSelectedAppIdsChange: (selectedAppIds: string[]) => void;
  sensitiveOptions: SensitiveOption[];
  onSensitiveOptionsChange: (options: SensitiveOption[]) => void;
  appsGuardMessage: string | null;
  clearAppsGuardMessage: () => void;
  onOpenProjectFolderById: (projectId: string) => void;
  onUpdateProjectMetadata: (projectId: string, draft: { name: string; siteId: string; authSelection: Project["authSelection"] }) => void;
  onRemoveProjectFromHome: (projectId: string) => void;
  onUpdateConnectedSite: (siteId: string, draft: { displayName: string; domain: string }) => void;
  onRemoveConnectedSite: (siteId: string) => void;
  onUpdateAuthProfile: (authProfileId: string, draft: { displayName: string; username: string; credentialUpdated?: boolean }) => void;
  onRemoveAuthProfile: (authProfileId: string) => void;
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
        projects={workspaceView.projects}
        connectedSites={workspaceView.connectedSites}
        profiles={workspaceView.profiles}
        workspaceMode={workspaceMode}
        onOpenProjectFolder={onOpenProjectFolderById}
        onUpdateProject={onUpdateProjectMetadata}
        onRemoveProject={onRemoveProjectFromHome}
        onUpdateSite={onUpdateConnectedSite}
        onRemoveSite={onRemoveConnectedSite}
        onUpdateAuthProfile={onUpdateAuthProfile}
        onRemoveAuthProfile={onRemoveAuthProfile}
      />
    );
  }

  if (pathname === "/new-tab") {
    return (
      <NewTabScreen
        onAddSite={() => navigate(onboardingPath("add-site"))}
        onNewProject={() => navigate(onboardingPath("new-project"))}
        onOpenProjectFromFolder={onOpenProjectFromFolder}
        onOpenRecentProject={(id) => openProjectTab(id, "overview")}
        projects={workspaceView.projects}
      />
    );
  }

  if (pathname.endsWith("/apps")) {
    return (
      <AppsScreen
        site={activeProject}
        apps={activeProjectApps.apps}
        appListSource={activeProjectApps.source}
        selectedAppIds={selectedAppIds}
        onSelectionChange={(nextSelectedIds) => {
          clearAppsGuardMessage();
          onSelectedAppIdsChange(nextSelectedIds);
        }}
        onContinue={() => navigate(projectRoutes.scan)}
        onMockAction={onMockAction}
        guardMessage={appsGuardMessage}
      />
    );
  }

  if (pathname.endsWith("/scan/advanced") || pathname.endsWith("/scan/confirm")) {
    return (
      <SensitiveOptionsScreen
        site={activeProject}
        compact={pathname.endsWith("/scan/confirm")}
        canStartScan={canStartScan}
        additionalOptions={sensitiveOptions}
        onAdditionalOptionsChange={onSensitiveOptionsChange}
        onBack={() => navigate(projectRoutes.scan)}
        onChooseApps={() => navigate(projectRoutes.apps)}
        onConfirm={() => {
          if (!canStartScan) {
            onMockAction("Choose at least one app before starting a scan.", { tone: "warn" });
            return;
          }
          navigate(hasArmedSensitiveOptions(sensitiveOptions.map((option) => ({ categoryKey: option.key, label: option.label, enabled: option.value, meta: option.meta }))) ? `${projectRoutes.scan}/confirm` : `${projectRoutes.scan}/run`);
        }}
      />
    );
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
        canStartScan={canStartScan}
        onReports={() => navigate(projectRoutes.reports)}
        onSnapshot={() => navigate(projectRoutes.snapshot)}
        onDeveloperFiles={() => navigate(projectRoutes["developer-files"])}
        onChooseApps={() => navigate(projectRoutes.apps)}
        onRetry={() => navigate(projectRoutes.scan)}
        onFixConnection={() => navigate("/home/accounts")}
        onPartialSummary={() => navigate(projectRoutes.snapshot)}
        onMockAction={onMockAction}
      />
    );
  }

  if (pathname.endsWith("/scan")) {
    return (
      <ScanSetupScreen
        site={activeProject}
        canStartScan={canStartScan}
        onAdvanced={() => navigate(`${projectRoutes.scan}/advanced`)}
        onStart={() => navigate(`${projectRoutes.scan}/run`)}
        onChooseApps={() => navigate(projectRoutes.apps)}
        onMockAction={onMockAction}
      />
    );
  }

  if (pathname.endsWith("/snapshot")) {
    return (
      <LocalSnapshotScreen
        site={activeProject}
        canStartScan={canStartScan}
        onChangeSettings={() => navigate(projectRoutes.scan)}
        onOpenFullScan={() => navigate(`${projectRoutes.scan}/run?source=rerun`)}
        onChooseApps={() => navigate(projectRoutes.apps)}
        onMockAction={onMockAction}
        onOpenFolder={onOpenProjectFolder}
      />
    );
  }

  if (pathname.includes("/reports")) {
    return <ReportsScreen site={activeProject} onMockAction={onMockAction} onRevealFolder={onOpenProjectFolder} />;
  }

  if (pathname.endsWith("/developer-files")) {
    return <DeveloperFilesScreen site={activeProject} onMockAction={onMockAction} onRevealFolder={onOpenProjectFolder} />;
  }

  if (pathname.includes("/history")) {
    return <HistoryScreen site={activeProject} onMockAction={onMockAction} />;
  }

  if (pathname.endsWith("/settings")) {
    return <SettingsScreen site={activeProject} onMockAction={onMockAction} />;
  }

  if (pathname.endsWith("/advanced")) {
    return <AdvancedInternalDataScreen site={activeProject} onOpenInternalFolder={onOpenProjectFolder} />;
  }

  return (
    <SiteOverviewScreen
      site={activeProject}
      canStartScan={canStartScan}
      onScanSettings={() => navigate(projectRoutes.scan)}
      onOpenFullScan={() => navigate(`${projectRoutes.scan}/run`)}
      onChooseApps={() => navigate(projectRoutes.apps)}
      onSnapshot={() => navigate(projectRoutes.snapshot)}
      onReports={() => navigate(projectRoutes.reports)}
      onDeveloperFiles={() => navigate(projectRoutes["developer-files"])}
      onMockAction={onMockAction}
      onOpenProjectFolder={onOpenProjectFolder}
    />
  );
}
