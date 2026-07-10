import fs from "node:fs/promises";
import path from "node:path";
import type {
  BridgeResult,
  CreateProjectRequest,
  CreateProjectResult,
  OpenProjectResult,
  ProjectTabSnapshot,
  RemoveAuthProfileResult,
  RemoveConnectedSiteResult,
  RemoveProjectFromAppResult,
  SaveAuthProfileResult,
  SaveConnectedSiteResult,
  UpdateProjectAppListResult,
  UpdateProjectMetadataRequest,
  UpdateProjectMetadataResult,
  WindowStateSnapshot,
  WorkspaceHomeSnapshot,
  WorkspaceMetadataIssue,
} from "../src/platform/bridgeTypes";
import type {
  AppIndex,
  AppIndexEntry,
  AppSummary,
  AuthProfile,
  ConnectedSite,
  CurrentSnapshotPointer,
  Project,
  ProjectAppList,
  ProjectHistory,
  ValidationResult,
} from "../packages/core/src/types.js";

const schemaVersion = 1;
type CoreModule = typeof import("../packages/core/src/index.js");
type MetadataValidator<T> = (core: CoreModule, value: unknown) => ValidationResult<T>;
const coreModulePromise: Promise<CoreModule> = import("../packages/core/src/index.js");

interface WorkspaceStorageOptions {
  appDataRoot: string;
  now?: () => Date;
}

interface JsonReadResult<T> {
  value: T | null;
  issue?: WorkspaceMetadataIssue;
}

const appIndexFile = "app-index.json";
const connectedSitesFile = "connected-sites.json";
const authProfilesFile = "auth-profiles.json";
const windowStateFile = "window-state.json";
const managedCredentialRefPattern = /^keychain:\/\/ksd\/(auth_profile|project_local)\/[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export function createWorkspaceStorage({ appDataRoot, now = () => new Date() }: WorkspaceStorageOptions) {
  const defaultProjectsRoot = path.join(appDataRoot, "Projects");

  async function readWorkspaceHome(): Promise<WorkspaceHomeSnapshot> {
    await ensureDir(appDataRoot);
    await ensureDir(defaultProjectsRoot);

    const errors: WorkspaceMetadataIssue[] = [];
    const appIndex = await readJson<AppIndex>(path.join(appDataRoot, appIndexFile), defaultAppIndex(), "app", false, (core, value) => core.validateAppIndex(value));
    const connectedSites = await readJson<ConnectedSite[]>(path.join(appDataRoot, connectedSitesFile), [], "app", false, (core, value) => core.validateConnectedSiteList(value));
    const authProfiles = await readJson<AuthProfile[]>(path.join(appDataRoot, authProfilesFile), [], "app", false, (core, value) => core.validateAuthProfileList(value));

    pushIssue(errors, appIndex.issue);
    pushIssue(errors, connectedSites.issue);
    pushIssue(errors, authProfiles.issue);

    const projects: Project[] = [];
    const projectAppListsByProjectId: Record<string, ProjectAppList> = {};
    for (const entry of appIndex.value?.recentProjects ?? []) {
      const projectRead = await readProjectAt(entry.folderPath);
      if (projectRead.ok && projectRead.project) {
        projects.push(projectRead.project);
        if (projectRead.appList) {
          projectAppListsByProjectId[projectRead.project.id] = projectRead.appList;
        }
      } else {
        projectRead.errors?.forEach((issue) => errors.push(issue));
      }
    }

    return {
      schemaVersion,
      appDataRoot,
      defaultProjectsRoot,
      projects,
      connectedSites: connectedSites.value ?? [],
      authProfiles: authProfiles.value ?? [],
      projectAppListsByProjectId,
      errors,
    };
  }

  async function createProject(request: CreateProjectRequest): Promise<CreateProjectResult> {
    const timestamp = toIso(now());
    const folderPath = path.resolve(request.folderPath);
    const pathIssue = validateProjectFolderPath(folderPath);
    if (pathIssue) {
      return { ok: false, message: pathIssue.message, errors: [pathIssue] };
    }
    if (await fileExists(path.join(folderPath, "project.json"))) {
      return {
        ok: false,
        message: "A project.json file already exists in that folder. Choose a different local folder or open the existing project.",
        errors: [{ scope: "project", path: folderPath, code: "invalid_metadata", message: "Project folder already contains project metadata.", recoverable: true }],
      };
    }

    const core = await coreModulePromise;
    const appIndex = await readAppIndex();
    const projectId = core.createCollisionSafeLocalId("project", request.name, appIndex.recentProjects.map((entry) => entry.projectId));
    const project: Project = {
      id: projectId,
      name: request.name.trim(),
      folderPath,
      createdAt: timestamp,
      lastOpenedAt: timestamp,
      siteId: request.connectedSite.id,
      authSelection: request.authSelection,
      schemaVersion,
    };

    const connectedSite: ConnectedSite = {
      ...request.connectedSite,
      linkedProjectIds: addUnique(request.connectedSite.linkedProjectIds, project.id),
      savedStatus: "saved",
    };

    const appSummaries = request.appSummaries ?? [];

    try {
      await initializeProjectFolder(project, connectedSite, appSummaries, timestamp);
      await upsertConnectedSite(connectedSite);
      if (request.authSelection.kind === "global_profile" && request.authProfile) {
        await upsertAuthProfile({
          ...request.authProfile,
          linkedProjectIds: addUnique(request.authProfile.linkedProjectIds, project.id),
        });
      }
      await upsertRecentProject(project);
      return { ok: true, project, connectedSite, appSummaries };
    } catch (error) {
      return {
        ok: false,
        message: errorMessage(error),
        errors: [ioIssue("project", folderPath, errorMessage(error))],
      };
    }
  }

  async function readProjectAt(folderPath: string): Promise<OpenProjectResult> {
    const projectPath = path.join(folderPath, "project.json");
    const sitePath = path.join(folderPath, "connected-site.json");
    const appListPath = path.join(folderPath, "app-list.json");
    const currentPath = path.join(folderPath, "current.json");
    const historyPath = path.join(folderPath, "history.json");
    const projectRead = await readJson<Project>(projectPath, null, "project", true, (core, value) => core.validateProject(value));
    const siteRead = await readJson<ConnectedSite>(sitePath, null, "project", true, (core, value) => core.validateConnectedSite(value));
    const appListRead = await readJson<ProjectAppList>(appListPath, null, "project", true, (core, value) => core.validateProjectAppList(value));
    const currentRead = await readJson<CurrentSnapshotPointer>(currentPath, null, "project", true, (core, value) => core.validateCurrentSnapshotPointer(value));
    const historyRead = await readJson<ProjectHistory>(historyPath, null, "project", true, (core, value) => core.validateProjectHistory(value));
    const errors = [projectRead.issue, siteRead.issue, appListRead.issue, currentRead.issue, historyRead.issue].filter(Boolean) as WorkspaceMetadataIssue[];

    if (!projectRead.value || !siteRead.value) {
      return {
        ok: false,
        message: "Project metadata is missing or unreadable.",
        errors,
      };
    }

    return {
      ok: true,
      project: projectRead.value,
      connectedSite: siteRead.value,
      appList: appListRead.value ?? undefined,
      appSummaries: appListRead.value?.apps ?? [],
      errors,
    };
  }

  async function openProject(folderPath: string): Promise<OpenProjectResult> {
    const resolvedPath = path.resolve(folderPath);
    const readResult = await readProjectAt(resolvedPath);
    if (!readResult.ok || !readResult.project || !readResult.connectedSite) {
      return readResult;
    }

    const openedAt = toIso(now());
    const project = { ...readResult.project, lastOpenedAt: openedAt };
    try {
      await writeJsonAtomic(path.join(resolvedPath, "project.json"), project, (core, value) => core.validateProject(value));
      await writeJsonAtomic(path.join(resolvedPath, ".app", "recent.json"), {
        projectId: project.id,
        lastOpenedAt: openedAt,
      });
      await upsertRecentProject(project);
      await upsertConnectedSite(readResult.connectedSite);
    } catch (error) {
      return {
        ok: false,
        project,
        connectedSite: readResult.connectedSite,
        appSummaries: readResult.appSummaries,
        message: errorMessage(error),
        errors: [ioIssue("project", resolvedPath, errorMessage(error))],
      };
    }

    return { ...readResult, project };
  }

  async function saveConnectedSite(site: ConnectedSite): Promise<SaveConnectedSiteResult> {
    let connectedSite = site;
    try {
      connectedSite = await prepareNewConnectedSite(site);
      await upsertConnectedSite({ ...connectedSite, savedStatus: "saved" });
      return { ok: true, code: "OK", message: "Connected site metadata saved.", connectedSite };
    } catch (error) {
      return { ok: false, code: "IO_ERROR", message: errorMessage(error), connectedSite };
    }
  }

  async function saveAuthProfile(profile: AuthProfile): Promise<SaveAuthProfileResult> {
    let authProfile = profile;
    try {
      authProfile = await prepareNewAuthProfile(profile);
      await upsertAuthProfile(authProfile);
      return { ok: true, code: "OK", message: "Auth profile metadata saved.", authProfile };
    } catch (error) {
      return { ok: false, code: "IO_ERROR", message: errorMessage(error), authProfile };
    }
  }

  async function updateProjectMetadata(request: UpdateProjectMetadataRequest): Promise<UpdateProjectMetadataResult> {
    const appIndex = await readAppIndex();
    const entry = appIndex.recentProjects.find((item) => item.projectId === request.projectId);
    if (!entry) {
      return { ok: false, code: "INVALID_INPUT", message: "Project is not in the app metadata index." };
    }

    const readResult = await readProjectAt(entry.folderPath);
    if (!readResult.ok || !readResult.project) {
      return { ok: false, code: "IO_ERROR", message: readResult.message ?? "Project metadata is unreadable.", errors: readResult.errors };
    }

    const connectedSites = await readConnectedSites();
    const nextSite = connectedSites.find((site) => site.id === request.siteId);
    if (!nextSite) {
      return { ok: false, code: "INVALID_INPUT", message: "Selected site metadata was not found." };
    }

    const previousProject = readResult.project;
    const timestamp = toIso(now());
    const project: Project = {
      ...previousProject,
      name: request.name.trim() || previousProject.name,
      siteId: request.siteId,
      authSelection: request.authSelection,
      lastOpenedAt: timestamp,
    };

    try {
      await writeJsonAtomic(path.join(project.folderPath, "project.json"), project, (core, value) => core.validateProject(value));
      await writeJsonAtomic(path.join(project.folderPath, "connected-site.json"), {
        ...nextSite,
        linkedProjectIds: addUnique(nextSite.linkedProjectIds, project.id),
      }, (core, value) => core.validateConnectedSite(value));
      await writeJsonAtomic(path.join(project.folderPath, ".app", "recent.json"), {
        projectId: project.id,
        lastOpenedAt: timestamp,
      });
      await upsertRecentProject(project);
      await rewriteProjectLinks(project.id, previousProject.siteId, project.siteId, previousProject.authSelection, project.authSelection);
      return { ok: true, code: "OK", message: "Project metadata updated.", project, connectedSite: nextSite };
    } catch (error) {
      return { ok: false, code: "IO_ERROR", message: errorMessage(error), errors: [ioIssue("project", project.folderPath, errorMessage(error))], project };
    }
  }

  async function updateProjectAppList(projectId: string, appSummaries: AppSummary[], selectedAppIds: string[], appListFetchedAt?: string): Promise<UpdateProjectAppListResult> {
    const idValidation = (await coreModulePromise).validateLocalId(projectId, "projectId");
    if (!idValidation.ok) {
      return { ok: false, code: "INVALID_INPUT", message: formatValidationIssues(idValidation.issues) };
    }

    const appIndex = await readAppIndex();
    const entry = appIndex.recentProjects.find((item) => item.projectId === projectId);
    if (!entry) {
      return { ok: false, code: "INVALID_INPUT", message: "Project is not in the app metadata index." };
    }

    const readResult = await readProjectAt(entry.folderPath);
    if (!readResult.ok || !readResult.project) {
      return { ok: false, code: "IO_ERROR", message: readResult.message ?? "Project metadata is unreadable." };
    }

    const appList: ProjectAppList = {
      schemaVersion,
      appListFetchedAt: appListFetchedAt ?? readResult.appList?.appListFetchedAt ?? null,
      apps: appSummaries,
      selectedAppIds,
    };
    const core = await coreModulePromise;
    const validation = core.validateProjectAppList(appList);
    if (!validation.ok) {
      return { ok: false, code: "INVALID_INPUT", message: `App-list metadata is invalid: ${formatValidationIssues(validation.issues)}` };
    }

    try {
      await writeJsonAtomic(path.join(readResult.project.folderPath, "app-list.json"), appList, (coreModule, value) => coreModule.validateProjectAppList(value));
      return { ok: true, code: "OK", message: "Project app-list metadata updated.", appList };
    } catch (error) {
      return { ok: false, code: "IO_ERROR", message: errorMessage(error), appList };
    }
  }

  async function removeProjectFromApp(projectId: string): Promise<RemoveProjectFromAppResult> {
    const appIndex = await readAppIndex();
    const nextProjects = appIndex.recentProjects.filter((item) => item.projectId !== projectId);
    if (nextProjects.length === appIndex.recentProjects.length) {
      return { ok: false, code: "INVALID_INPUT", message: "Project is not in the app metadata index.", projectId };
    }

    try {
      await writeAppIndex({ ...appIndex, recentProjects: nextProjects });
      await updateConnectedSites((sites) => sites.map((site) => ({ ...site, linkedProjectIds: removeValue(site.linkedProjectIds, projectId) })));
      await updateAuthProfiles((profiles) => profiles.map((profile) => ({ ...profile, linkedProjectIds: removeValue(profile.linkedProjectIds, projectId) })));
      return { ok: true, code: "OK", message: "Project removed from app metadata. Project folder was not deleted.", projectId };
    } catch (error) {
      return { ok: false, code: "IO_ERROR", message: errorMessage(error), projectId };
    }
  }

  async function updateConnectedSite(site: ConnectedSite): Promise<SaveConnectedSiteResult> {
    const sites = await readConnectedSites();
    const current = sites.find((item) => item.id === site.id);
    if (!current) {
      return { ok: false, code: "INVALID_INPUT", message: "Connected site metadata was not found.", connectedSite: site };
    }

    const nextSite: ConnectedSite = {
      ...current,
      displayName: site.displayName,
      domain: site.domain,
      savedStatus: "saved",
    };

    try {
      await updateConnectedSites((items) => upsertById(items, nextSite));
      await writeCachedConnectedSiteForOpenProjects(nextSite);
      return { ok: true, code: "OK", message: "Connected site metadata updated.", connectedSite: nextSite };
    } catch (error) {
      return { ok: false, code: "IO_ERROR", message: errorMessage(error), connectedSite: nextSite };
    }
  }

  async function removeConnectedSite(siteId: string): Promise<RemoveConnectedSiteResult> {
    const sites = await readConnectedSites();
    const site = sites.find((item) => item.id === siteId);
    if (!site) {
      return { ok: false, code: "INVALID_INPUT", message: "Connected site metadata was not found.", siteId };
    }

    const appIndex = await readAppIndex();
    const linkedProjectIds = new Set([...site.linkedProjectIds, ...appIndex.recentProjects.filter((project) => project.siteId === siteId).map((project) => project.projectId)]);
    if (linkedProjectIds.size > 0) {
      return { ok: false, code: "CONFLICT", message: "Connected site is still linked to one or more projects.", siteId };
    }

    try {
      await updateConnectedSites((items) => items.filter((item) => item.id !== siteId));
      return { ok: true, code: "OK", message: "Connected site metadata removed.", siteId };
    } catch (error) {
      return { ok: false, code: "IO_ERROR", message: errorMessage(error), siteId };
    }
  }

  async function updateAuthProfile(profile: AuthProfile): Promise<SaveAuthProfileResult> {
    const profiles = await readAuthProfiles();
    const current = profiles.find((item) => item.id === profile.id);
    if (!current) {
      return { ok: false, code: "INVALID_INPUT", message: "Auth profile metadata was not found.", authProfile: profile };
    }

    const nextProfile: AuthProfile = {
      ...current,
      displayName: profile.displayName,
      username: profile.username,
      authType: "password",
      credentialStatus: profile.credentialStatus,
      keychainRef: profile.keychainRef || current.keychainRef,
    };

    try {
      await updateAuthProfiles((items) => upsertById(items, nextProfile));
      return { ok: true, code: "OK", message: "Auth profile metadata updated.", authProfile: nextProfile };
    } catch (error) {
      return { ok: false, code: "IO_ERROR", message: errorMessage(error), authProfile: nextProfile };
    }
  }

  async function removeAuthProfile(authProfileId: string): Promise<RemoveAuthProfileResult> {
    const profiles = await readAuthProfiles();
    const profile = profiles.find((item) => item.id === authProfileId);
    if (!profile) {
      return { ok: false, code: "INVALID_INPUT", message: "Auth profile metadata was not found.", authProfileId };
    }

    const linkedProjectIds = new Set(profile.linkedProjectIds);
    for (const project of (await readAppIndex()).recentProjects) {
      const readResult = await readProjectAt(project.folderPath);
      if (readResult.project?.authSelection.kind === "global_profile" && readResult.project.authSelection.authProfileId === authProfileId) {
        linkedProjectIds.add(readResult.project.id);
      }
    }

    if (linkedProjectIds.size > 0) {
      return { ok: false, code: "CONFLICT", message: "Auth profile is still linked to one or more projects.", authProfileId };
    }

    try {
      await updateAuthProfiles((items) => items.filter((item) => item.id !== authProfileId));
      return { ok: true, code: "OK", message: "Auth profile metadata removed.", authProfileId };
    } catch (error) {
      return { ok: false, code: "IO_ERROR", message: errorMessage(error), authProfileId };
    }
  }

  async function readWindowState(): Promise<WindowStateSnapshot> {
    const filePath = path.join(appDataRoot, windowStateFile);
    const exists = await fileExists(filePath);
    const read = await readJson<WindowStateSnapshot>(filePath, defaultWindowState(false), "app", false, (core, value) => core.validateWindowStateSnapshot(value));
    return { ...(read.value ?? defaultWindowState(false)), restored: exists && !read.issue };
  }

  async function writeWindowState(state: WindowStateSnapshot) {
    await ensureDir(appDataRoot);
    await writeJsonAtomic(path.join(appDataRoot, windowStateFile), {
      openProjectTabs: state.openProjectTabs,
      activeTabId: state.activeTabId,
      restored: true,
    }, (core, value) => core.validateWindowStateSnapshot(value));
  }

  async function readOpenProjectTabs(): Promise<ProjectTabSnapshot[]> {
    const state = await readWindowState();
    return state.openProjectTabs;
  }

  async function writeOpenProjectTabs(tabs: ProjectTabSnapshot[]) {
    const current = await readWindowState();
    await writeWindowState({ ...current, openProjectTabs: tabs });
  }

  async function validateOpenLocalFolder(folderPath: string): Promise<BridgeResult> {
    if (!folderPath || !path.isAbsolute(folderPath)) {
      return { ok: false, code: "INVALID_INPUT", message: "A valid absolute folder path is required." };
    }
    if (hasTraversalSegment(folderPath)) {
      return { ok: false, code: "INVALID_INPUT", message: "Folder paths with traversal segments are not allowed." };
    }

    const resolvedPath = path.resolve(folderPath);
    const directory = await readDirectoryStat(resolvedPath);
    if (!directory.exists) {
      return { ok: false, code: "INVALID_INPUT", message: "The requested folder does not exist." };
    }
    if (!directory.isDirectory) {
      return { ok: false, code: "INVALID_INPUT", message: "The requested path is not a folder." };
    }

    const appRoot = path.resolve(appDataRoot);
    if (samePath(resolvedPath, appRoot)) {
      return { ok: true, code: "OK", message: "Folder is allowed." };
    }

    const appIndex = await readAppIndex();
    for (const projectEntry of appIndex.recentProjects) {
      const projectRoot = path.resolve(projectEntry.folderPath);
      if (samePath(resolvedPath, projectRoot)) {
        return { ok: true, code: "OK", message: "Folder is allowed." };
      }

      const relativePath = path.relative(projectRoot, resolvedPath);
      if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        continue;
      }

      const [topLevel] = relativePath.split(/[\\/]+/);
      if (["snapshots", ".app", ".kintone", "packages"].includes(topLevel)) {
        return { ok: true, code: "OK", message: "Folder is allowed." };
      }
    }

    return { ok: false, code: "INVALID_INPUT", message: "Only the app data folder, known project folders, and generated project subfolders can be opened from the app." };
  }

  async function prepareNewConnectedSite(site: ConnectedSite): Promise<ConnectedSite> {
    const current = await readConnectedSites();
    if (!current.some((item) => item.id === site.id)) {
      return site;
    }

    const core = await coreModulePromise;
    return {
      ...site,
      id: core.createCollisionSafeLocalId("site", site.displayName || site.domain, current.map((item) => item.id)),
      linkedProjectIds: [],
    };
  }

  async function prepareNewAuthProfile(profile: AuthProfile): Promise<AuthProfile> {
    const current = await readAuthProfiles();
    if (!current.some((item) => item.id === profile.id)) {
      return profile;
    }

    const core = await coreModulePromise;
    const id = core.createCollisionSafeLocalId("auth", profile.displayName || profile.username, current.map((item) => item.id));
    return {
      ...profile,
      id,
      keychainRef: isManagedCredentialRef(profile.keychainRef) ? profile.keychainRef : `keychain://pending/${id}`,
      linkedProjectIds: [],
    };
  }

  async function upsertConnectedSite(site: ConnectedSite) {
    const filePath = path.join(appDataRoot, connectedSitesFile);
    const current = (await readJson<ConnectedSite[]>(filePath, [], "app", false, (core, value) => core.validateConnectedSiteList(value))).value ?? [];
    const next = upsertById(current, site);
    await writeJsonAtomic(filePath, next, (core, value) => core.validateConnectedSiteList(value));
  }

  async function readConnectedSites() {
    return (await readJson<ConnectedSite[]>(path.join(appDataRoot, connectedSitesFile), [], "app", false, (core, value) => core.validateConnectedSiteList(value))).value ?? [];
  }

  async function updateConnectedSites(mutator: (items: ConnectedSite[]) => ConnectedSite[]) {
    const filePath = path.join(appDataRoot, connectedSitesFile);
    const current = await readConnectedSites();
    const next = mutator(current);
    await writeJsonAtomic(filePath, next, (core, value) => core.validateConnectedSiteList(value));
  }

  async function upsertAuthProfile(profile: AuthProfile) {
    const filePath = path.join(appDataRoot, authProfilesFile);
    const current = (await readJson<AuthProfile[]>(filePath, [], "app", false, (core, value) => core.validateAuthProfileList(value))).value ?? [];
    const next = upsertById(current, profile);
    await writeJsonAtomic(filePath, next, (core, value) => core.validateAuthProfileList(value));
  }

  async function readAuthProfiles() {
    return (await readJson<AuthProfile[]>(path.join(appDataRoot, authProfilesFile), [], "app", false, (core, value) => core.validateAuthProfileList(value))).value ?? [];
  }

  async function updateAuthProfiles(mutator: (items: AuthProfile[]) => AuthProfile[]) {
    const filePath = path.join(appDataRoot, authProfilesFile);
    const current = await readAuthProfiles();
    const next = mutator(current);
    await writeJsonAtomic(filePath, next, (core, value) => core.validateAuthProfileList(value));
  }

  async function upsertRecentProject(project: Project) {
    const current = await readAppIndex();
    const entry: AppIndexEntry = {
      projectId: project.id,
      name: project.name,
      folderPath: project.folderPath,
      siteId: project.siteId,
      lastOpenedAt: project.lastOpenedAt,
    };
    const recentProjects = [entry, ...current.recentProjects.filter((item) => item.projectId !== project.id)];
    await writeAppIndex({ schemaVersion, recentProjects });
  }

  async function readAppIndex() {
    return (await readJson<AppIndex>(path.join(appDataRoot, appIndexFile), defaultAppIndex(), "app", false, (core, value) => core.validateAppIndex(value))).value ?? defaultAppIndex();
  }

  async function writeAppIndex(appIndex: AppIndex) {
    await writeJsonAtomic(path.join(appDataRoot, appIndexFile), { schemaVersion, recentProjects: appIndex.recentProjects }, (core, value) => core.validateAppIndex(value));
  }

  async function rewriteProjectLinks(projectId: string, previousSiteId: string, nextSiteId: string, previousAuthSelection: Project["authSelection"], nextAuthSelection: Project["authSelection"]) {
    await updateConnectedSites((sites) =>
      sites.map((site) => {
        const withoutProject = removeValue(site.linkedProjectIds, projectId);
        return site.id === nextSiteId ? { ...site, linkedProjectIds: addUnique(withoutProject, projectId) } : { ...site, linkedProjectIds: site.id === previousSiteId ? withoutProject : site.linkedProjectIds };
      }),
    );

    const previousAuthProfileId = previousAuthSelection.kind === "global_profile" ? previousAuthSelection.authProfileId : undefined;
    const nextAuthProfileId = nextAuthSelection.kind === "global_profile" ? nextAuthSelection.authProfileId : undefined;
    await updateAuthProfiles((profiles) =>
      profiles.map((profile) => {
        const withoutProject = removeValue(profile.linkedProjectIds, projectId);
        return profile.id === nextAuthProfileId
          ? { ...profile, linkedProjectIds: addUnique(withoutProject, projectId) }
          : { ...profile, linkedProjectIds: profile.id === previousAuthProfileId ? withoutProject : profile.linkedProjectIds };
      }),
    );
  }

  async function writeCachedConnectedSiteForOpenProjects(site: ConnectedSite) {
    const appIndex = await readAppIndex();
    for (const projectEntry of appIndex.recentProjects) {
      if (projectEntry.siteId !== site.id) {
        continue;
      }

      try {
        await writeJsonAtomic(path.join(projectEntry.folderPath, "connected-site.json"), site, (core, value) => core.validateConnectedSite(value));
      } catch {
        // Best-effort cache refresh. The app-level metadata remains the source of truth.
      }
    }
  }

  async function initializeProjectFolder(project: Project, connectedSite: ConnectedSite, apps: AppSummary[], timestamp: string) {
    await ensureDir(project.folderPath);
    await ensureDir(path.join(project.folderPath, "snapshots"));
    await ensureDir(path.join(project.folderPath, ".app"));
    await ensureDir(path.join(project.folderPath, ".kintone"));
    await ensureDir(path.join(project.folderPath, ".kintone", "raw"));
    await ensureDir(path.join(project.folderPath, ".kintone", "normalized"));
    await ensureDir(path.join(project.folderPath, ".kintone", "collector-results"));
    await ensureDir(path.join(project.folderPath, ".kintone", "logs"));

    const appList: ProjectAppList = {
      schemaVersion,
      appListFetchedAt: null,
      apps,
      selectedAppIds: apps.map((app) => app.id),
    };
    const current: CurrentSnapshotPointer = {
      projectId: project.id,
      siteId: project.siteId,
      currentSnapshotId: null,
      currentSnapshotPath: null,
      updatedAt: null,
    };
    const history: ProjectHistory = {
      schemaVersion,
      runs: [],
    };

    await writeJsonAtomic(path.join(project.folderPath, "project.json"), project, (core, value) => core.validateProject(value));
    await writeJsonAtomic(path.join(project.folderPath, "connected-site.json"), connectedSite, (core, value) => core.validateConnectedSite(value));
    await writeJsonAtomic(path.join(project.folderPath, "app-list.json"), appList, (core, value) => core.validateProjectAppList(value));
    await writeJsonAtomic(path.join(project.folderPath, "current.json"), current, (core, value) => core.validateCurrentSnapshotPointer(value));
    await writeJsonAtomic(path.join(project.folderPath, "history.json"), history, (core, value) => core.validateProjectHistory(value));
    await writeJsonAtomic(path.join(project.folderPath, ".app", "schema-version.json"), { schemaVersion, updatedAt: timestamp });
    await writeJsonAtomic(path.join(project.folderPath, ".app", "recent.json"), { projectId: project.id, lastOpenedAt: timestamp });
  }

  return {
    appDataRoot,
    defaultProjectsRoot,
    readWorkspaceHome,
    createProject,
    openProject,
    readProjectAt,
    saveConnectedSite,
    saveAuthProfile,
    updateProjectMetadata,
    updateProjectAppList,
    removeProjectFromApp,
    updateConnectedSite,
    removeConnectedSite,
    updateAuthProfile,
    removeAuthProfile,
    readWindowState,
    writeWindowState,
    readOpenProjectTabs,
    writeOpenProjectTabs,
    validateOpenLocalFolder,
  };
}

async function readJson<T>(filePath: string, fallback: T | null, scope: "app" | "project", required: boolean, validator?: MetadataValidator<T>): Promise<JsonReadResult<T>> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!validator) {
      return { value: parsed as T };
    }

    const core = await coreModulePromise;
    const result = validator(core, parsed);
    if (!result.ok) {
      return {
        value: fallback,
        issue: {
          scope,
          path: filePath,
          code: "invalid_metadata",
          message: `Metadata JSON is parseable but invalid: ${formatValidationIssues(result.issues)}`,
          recoverable: true,
        },
      };
    }

    return { value: result.value };
  } catch (error) {
    if (isMissingFileError(error)) {
      return {
        value: fallback,
        issue: required ? { scope, path: filePath, code: "missing", message: "Metadata file is missing.", recoverable: true } : undefined,
      };
    }

    if (error instanceof SyntaxError) {
      return {
        value: fallback,
        issue: { scope, path: filePath, code: "corrupt_json", message: "Metadata JSON is corrupt and can be repaired by recreating the file.", recoverable: true },
      };
    }

    return {
      value: fallback,
      issue: { scope, path: filePath, code: "io_error", message: errorMessage(error), recoverable: true },
    };
  }
}

async function writeJsonAtomic<T>(filePath: string, value: T, validator?: MetadataValidator<T>) {
  const core = await coreModulePromise;
  core.assertNoSecretReferences(value);
  if (validator) {
    const validation = validator(core, value);
    if (!validation.ok) {
      throw new Error(`Invalid metadata for ${path.basename(filePath)}: ${formatValidationIssues(validation.issues)}`);
    }
  }

  await ensureDir(path.dirname(filePath));
  const tempPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  await fs.writeFile(tempPath, core.stringifyDeterministic(value), "utf8");
  await fs.rename(tempPath, filePath);
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

function defaultAppIndex(): AppIndex {
  return { schemaVersion, recentProjects: [] };
}

function defaultWindowState(restored: boolean): WindowStateSnapshot {
  return { openProjectTabs: [], activeTabId: "home", restored };
}

function pushIssue(errors: WorkspaceMetadataIssue[], issue: WorkspaceMetadataIssue | undefined) {
  if (issue) {
    errors.push(issue);
  }
}

function formatValidationIssues(issues: { path: string; message: string }[]) {
  return issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readDirectoryStat(folderPath: string): Promise<{ exists: boolean; isDirectory: boolean }> {
  try {
    const stat = await fs.stat(folderPath);
    return { exists: true, isDirectory: stat.isDirectory() };
  } catch (error) {
    if (isMissingFileError(error)) {
      return { exists: false, isDirectory: false };
    }
    throw error;
  }
}

function samePath(left: string, right: string) {
  return path.normalize(left).toLowerCase() === path.normalize(right).toLowerCase();
}

function hasTraversalSegment(folderPath: string) {
  return folderPath.split(/[\\/]+/).some((segment) => segment === "..");
}

function isManagedCredentialRef(value: string) {
  return managedCredentialRefPattern.test(value);
}

function upsertById<T extends { id: string }>(items: T[], nextItem: T): T[] {
  const existing = items.filter((item) => item.id !== nextItem.id);
  return [nextItem, ...existing];
}

function addUnique(items: string[], value: string) {
  return items.includes(value) ? items : [...items, value];
}

function removeValue(items: string[], value: string) {
  return items.filter((item) => item !== value);
}

function toIso(date: Date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function validateProjectFolderPath(folderPath: string): WorkspaceMetadataIssue | undefined {
  if (!path.isAbsolute(folderPath)) {
    return { scope: "project", path: folderPath, code: "invalid_metadata", message: "Project folder must be an absolute path.", recoverable: true };
  }

  const segments = folderPath.split(/[\\/]+/).filter(Boolean);
  const badSegment = segments.find((segment, index) => index > 0 && (/[<>:"|?*\u0000-\u001f]/.test(segment) || /[ .]$/.test(segment)));
  if (badSegment) {
    return {
      scope: "project",
      path: folderPath,
      code: "invalid_metadata",
      message: `Project folder segment "${badSegment}" is not Windows-safe.`,
      recoverable: true,
    };
  }

  return undefined;
}

function isMissingFileError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT";
}

function ioIssue(scope: "app" | "project", filePath: string, message: string): WorkspaceMetadataIssue {
  return { scope, path: filePath, code: "io_error", message, recoverable: true };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
