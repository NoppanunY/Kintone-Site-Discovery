import fs from "node:fs/promises";
import path from "node:path";
import type {
  CreateProjectRequest,
  CreateProjectResult,
  OpenProjectResult,
  ProjectTabSnapshot,
  RemoveAuthProfileResult,
  RemoveConnectedSiteResult,
  RemoveProjectFromAppResult,
  SaveAuthProfileResult,
  SaveConnectedSiteResult,
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
} from "../packages/core/src/types.js";

const schemaVersion = 1;

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

export function createWorkspaceStorage({ appDataRoot, now = () => new Date() }: WorkspaceStorageOptions) {
  const defaultProjectsRoot = path.join(appDataRoot, "Projects");

  async function readWorkspaceHome(): Promise<WorkspaceHomeSnapshot> {
    await ensureDir(appDataRoot);
    await ensureDir(defaultProjectsRoot);

    const errors: WorkspaceMetadataIssue[] = [];
    const appIndex = await readJson<AppIndex>(path.join(appDataRoot, appIndexFile), defaultAppIndex(), "app", false);
    const connectedSites = await readJson<ConnectedSite[]>(path.join(appDataRoot, connectedSitesFile), [], "app", false);
    const authProfiles = await readJson<AuthProfile[]>(path.join(appDataRoot, authProfilesFile), [], "app", false);

    pushIssue(errors, appIndex.issue);
    pushIssue(errors, connectedSites.issue);
    pushIssue(errors, authProfiles.issue);

    const projects: Project[] = [];
    for (const entry of appIndex.value?.recentProjects ?? []) {
      const projectRead = await readProjectAt(entry.folderPath);
      if (projectRead.ok && projectRead.project) {
        projects.push(projectRead.project);
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

    const projectId = createLocalId("project", request.name);
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
      assertNoSecretKeys(project);
      assertNoSecretKeys(connectedSite);
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
    const projectRead = await readJson<Project>(projectPath, null, "project", true);
    const siteRead = await readJson<ConnectedSite>(sitePath, null, "project", true);
    const appListRead = await readJson<ProjectAppList>(appListPath, null, "project", false);
    const errors = [projectRead.issue, siteRead.issue, appListRead.issue].filter(Boolean) as WorkspaceMetadataIssue[];

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
      await writeJsonAtomic(path.join(resolvedPath, "project.json"), project);
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
    try {
      await upsertConnectedSite({ ...site, savedStatus: "saved" });
      return { ok: true, code: "OK", message: "Connected site metadata saved.", connectedSite: site };
    } catch (error) {
      return { ok: false, code: "IO_ERROR", message: errorMessage(error), connectedSite: site };
    }
  }

  async function saveAuthProfile(profile: AuthProfile): Promise<SaveAuthProfileResult> {
    try {
      await upsertAuthProfile(profile);
      return { ok: true, code: "OK", message: "Auth profile metadata saved.", authProfile: profile };
    } catch (error) {
      return { ok: false, code: "IO_ERROR", message: errorMessage(error), authProfile: profile };
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
      assertNoSecretKeys(project);
      await writeJsonAtomic(path.join(project.folderPath, "project.json"), project);
      await writeJsonAtomic(path.join(project.folderPath, "connected-site.json"), {
        ...nextSite,
        linkedProjectIds: addUnique(nextSite.linkedProjectIds, project.id),
      });
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
    const read = await readJson<WindowStateSnapshot>(path.join(appDataRoot, windowStateFile), defaultWindowState(false), "app", false);
    return { ...(read.value ?? defaultWindowState(false)), restored: Boolean(read.value) };
  }

  async function writeWindowState(state: WindowStateSnapshot) {
    await ensureDir(appDataRoot);
    await writeJsonAtomic(path.join(appDataRoot, windowStateFile), {
      openProjectTabs: state.openProjectTabs,
      activeTabId: state.activeTabId,
      restored: true,
    });
  }

  async function readOpenProjectTabs(): Promise<ProjectTabSnapshot[]> {
    const state = await readWindowState();
    return state.openProjectTabs;
  }

  async function writeOpenProjectTabs(tabs: ProjectTabSnapshot[]) {
    const current = await readWindowState();
    await writeWindowState({ ...current, openProjectTabs: tabs });
  }

  async function upsertConnectedSite(site: ConnectedSite) {
    assertNoSecretKeys(site);
    const filePath = path.join(appDataRoot, connectedSitesFile);
    const current = (await readJson<ConnectedSite[]>(filePath, [], "app", false)).value ?? [];
    const next = upsertById(current, site);
    await writeJsonAtomic(filePath, next);
  }

  async function readConnectedSites() {
    return (await readJson<ConnectedSite[]>(path.join(appDataRoot, connectedSitesFile), [], "app", false)).value ?? [];
  }

  async function updateConnectedSites(mutator: (items: ConnectedSite[]) => ConnectedSite[]) {
    const filePath = path.join(appDataRoot, connectedSitesFile);
    const current = await readConnectedSites();
    const next = mutator(current);
    assertNoSecretKeys(next);
    await writeJsonAtomic(filePath, next);
  }

  async function upsertAuthProfile(profile: AuthProfile) {
    assertNoSecretKeys(profile);
    const filePath = path.join(appDataRoot, authProfilesFile);
    const current = (await readJson<AuthProfile[]>(filePath, [], "app", false)).value ?? [];
    const next = upsertById(current, profile);
    await writeJsonAtomic(filePath, next);
  }

  async function readAuthProfiles() {
    return (await readJson<AuthProfile[]>(path.join(appDataRoot, authProfilesFile), [], "app", false)).value ?? [];
  }

  async function updateAuthProfiles(mutator: (items: AuthProfile[]) => AuthProfile[]) {
    const filePath = path.join(appDataRoot, authProfilesFile);
    const current = await readAuthProfiles();
    const next = mutator(current);
    assertNoSecretKeys(next);
    await writeJsonAtomic(filePath, next);
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
    return (await readJson<AppIndex>(path.join(appDataRoot, appIndexFile), defaultAppIndex(), "app", false)).value ?? defaultAppIndex();
  }

  async function writeAppIndex(appIndex: AppIndex) {
    await writeJsonAtomic(path.join(appDataRoot, appIndexFile), { schemaVersion, recentProjects: appIndex.recentProjects });
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
        await writeJsonAtomic(path.join(projectEntry.folderPath, "connected-site.json"), site);
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

    await writeJsonAtomic(path.join(project.folderPath, "project.json"), project);
    await writeJsonAtomic(path.join(project.folderPath, "connected-site.json"), connectedSite);
    await writeJsonAtomic(path.join(project.folderPath, "app-list.json"), appList);
    await writeJsonAtomic(path.join(project.folderPath, "current.json"), current);
    await writeJsonAtomic(path.join(project.folderPath, "history.json"), history);
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
    removeProjectFromApp,
    updateConnectedSite,
    removeConnectedSite,
    updateAuthProfile,
    removeAuthProfile,
    readWindowState,
    writeWindowState,
    readOpenProjectTabs,
    writeOpenProjectTabs,
  };
}

async function readJson<T>(filePath: string, fallback: T | null, scope: "app" | "project", required: boolean): Promise<JsonReadResult<T>> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return { value: JSON.parse(raw) as T };
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

async function writeJsonAtomic(filePath: string, value: unknown) {
  assertNoSecretKeys(value);
  await ensureDir(path.dirname(filePath));
  const tempPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  await fs.writeFile(tempPath, stringifyDeterministic(value), "utf8");
  await fs.rename(tempPath, filePath);
}

function stringifyDeterministic(value: unknown) {
  return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

function sortJson(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  const record = value as Record<string, unknown>;
  return Object.keys(record)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      if (record[key] !== undefined) {
        result[key] = sortJson(record[key]);
      }
      return result;
    }, {});
}

function assertNoSecretKeys(value: unknown) {
  const secretKeyPattern = /(password|token|api[_-]?token|access[_-]?token|refresh[_-]?token|session|cookie|authorization|client[_-]?secret|private[_-]?key|bearer|proxy[_-]?secret)/i;
  const allowedKeys = new Set(["authType", "credentialStatus", "keychainRef"]);

  function walk(current: unknown, trail: string) {
    if (!current || typeof current !== "object") {
      return;
    }
    if (Array.isArray(current)) {
      current.forEach((item, index) => walk(item, `${trail}[${index}]`));
      return;
    }
    Object.entries(current as Record<string, unknown>).forEach(([key, item]) => {
      if (!allowedKeys.has(key) && secretKeyPattern.test(key)) {
        throw new Error(`Refusing to write secret-bearing metadata key: ${trail ? `${trail}.` : ""}${key}`);
      }
      walk(item, trail ? `${trail}.${key}` : key);
    });
  }

  walk(value, "");
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

function createLocalId(prefix: string, source: string) {
  const sourceSlug =
    source
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "local";
  return `${prefix}_${sourceSlug}`;
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
