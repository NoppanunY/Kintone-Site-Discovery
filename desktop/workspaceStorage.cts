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
  GetProjectScanHistoryResult,
  StartKintoneScanRunResult,
  StartFixtureScanRunRequest,
  StartFixtureScanRunResult,
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
  ScanRun,
  SnapshotAuthSelection,
  SnapshotManifest,
  ValidationResult,
} from "../packages/core/src/types.js";
import type { AppSummary as CoreAppSummary, KintoneRestCollectionResult } from "../packages/core/src/index.js";

const schemaVersion = 1;
type CoreModule = typeof import("../packages/core/src/index.js");
type MetadataValidator<T> = (core: CoreModule, value: unknown) => ValidationResult<T>;
const coreModulePromise: Promise<CoreModule> = import("../packages/core/src/index.js");

interface WorkspaceStorageOptions {
  appDataRoot: string;
  now?: () => Date;
}

interface WriteKintoneSnapshotScanRunInput {
  projectId: string;
  siteId: string;
  siteDomain: string;
  authSelection: SnapshotAuthSelection;
  presetId: ScanRun["presetId"];
  selectedAppIds: string[];
  enabledCategoryKeys: string[];
  sensitiveOptions: ScanRun["sensitiveOptions"];
  selectedApps: CoreAppSummary[];
  collection: KintoneRestCollectionResult;
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

  async function startFixtureScanRun(request: StartFixtureScanRunRequest): Promise<StartFixtureScanRunResult> {
    const readResult = await readProjectForProjectId(request.projectId);
    if (!readResult.ok || !readResult.project || !readResult.connectedSite) {
      return { ok: false, code: "INVALID_INPUT", message: readResult.message ?? "Project metadata was not found." };
    }

    if (request.selectedAppIds.length === 0) {
      return { ok: false, code: "INVALID_INPUT", message: "Choose at least one app before starting a fixture scan." };
    }

    const appList = readResult.appList;
    const availableIds = new Set(appList?.apps.map((app) => app.id) ?? []);
    const unknownAppId = request.selectedAppIds.find((appId) => !availableIds.has(appId));
    if (unknownAppId) {
      return { ok: false, code: "INVALID_INPUT", message: `Selected app ID is not present in the project app list: ${unknownAppId}` };
    }

    const core = await coreModulePromise;
    const authSelection = snapshotAuthSelection(readResult.project.authSelection, await readAuthProfiles());
    const run = core.buildFixtureScanRun({
      projectId: readResult.project.id,
      siteId: readResult.project.siteId,
      authSelection,
      presetId: request.presetId,
      selectedAppIds: request.selectedAppIds,
      enabledCategoryKeys: request.enabledCategoryKeys,
      sensitiveOptions: request.sensitiveOptions,
      outcome: request.outcome,
      startedAt: now(),
    });

    try {
      await appendProjectHistoryRun(readResult.project.folderPath, run);
      return { ok: true, code: "OK", message: "Fixture scan run completed and was written to history.", run };
    } catch (error) {
      return { ok: false, code: "IO_ERROR", message: errorMessage(error), run };
    }
  }

  async function writeKintoneSnapshotScanRun(input: WriteKintoneSnapshotScanRunInput): Promise<StartKintoneScanRunResult> {
    const readResult = await readProjectForProjectId(input.projectId);
    if (!readResult.ok || !readResult.project || !readResult.connectedSite) {
      return { ok: false, code: "INVALID_INPUT", message: readResult.message ?? "Project metadata was not found." };
    }

    const snapshotId = await nextSnapshotId(readResult.project.folderPath, input.collection.startedAt);
    const scanRunId = snapshotId.replace(/^snap_/, "scan_");
    const snapshotRelativePath = path.join("snapshots", snapshotId);
    const snapshotFinalPath = path.join(readResult.project.folderPath, snapshotRelativePath);
    const snapshotPartialPath = `${snapshotFinalPath}.partial`;
    const redactionLogPath = path.join("logs", "redaction-log.jsonl");
    const result = {
      ...input.collection.result,
      redaction: {
        ...input.collection.result.redaction,
        logPath: redactionLogPath,
      },
      ...(input.collection.result.status === "failed" ? { partialSummaryPath: path.join(snapshotRelativePath, "manifest.json") } : {}),
    };
    const run: ScanRun = {
      id: scanRunId,
      projectId: input.projectId,
      siteId: input.siteId,
      authSelection: input.authSelection,
      presetId: input.presetId,
      selectedAppIds: [...input.selectedAppIds],
      enabledCategoryKeys: [...input.enabledCategoryKeys],
      sensitiveOptions: input.sensitiveOptions,
      startedAt: input.collection.startedAt,
      finishedAt: input.collection.finishedAt,
      status: input.collection.status,
      snapshotId,
      result,
    };

    try {
      await ensureDir(snapshotPartialPath);
      const captureIndex = await writeSnapshotDataFiles(snapshotPartialPath, input.collection);
      await writeSnapshotJsonAtomic(path.join(snapshotPartialPath, "data", "app-list.json"), {
        schemaVersion,
        capturedAt: input.collection.finishedAt,
        apps: input.selectedApps,
      });
      await writeSnapshotJsonAtomic(path.join(snapshotPartialPath, "data", "collector-results.json"), {
        schemaVersion,
        scanRunId,
        captures: captureIndex,
      });
      await writeRedactionLog(path.join(snapshotPartialPath, redactionLogPath), input.collection);

      const manifest: SnapshotManifest = {
        snapshotId,
        scanRunId,
        projectId: input.projectId,
        siteId: input.siteId,
        siteDomain: input.siteDomain,
        authSelection: input.authSelection,
        schemaVersion,
        capturedAt: input.collection.finishedAt,
        status: input.collection.status,
        isCurrent: input.collection.status !== "failed",
        presetId: input.presetId,
        enabledCategoryKeys: [...input.enabledCategoryKeys],
        appIds: [...input.selectedAppIds],
        counts: {
          apps: result.appsCaptured,
          plugins: result.pluginsCaptured,
          files: captureIndex.filter((capture) => capture.storedPath).length,
          records: countCapturedRecords(input.collection),
        },
        sizeBytesOnDisk: 0,
        integrity: { verified: true, algorithm: "sha256", checkedAt: input.collection.finishedAt },
        fileOrder: [],
        redaction: result.redaction,
        reports: [],
        developerFiles: [],
      };
      await writeJsonAtomic(path.join(snapshotPartialPath, "manifest.json"), manifest);
      const sizeBytesOnDisk = await directorySizeBytes(snapshotPartialPath);
      await writeJsonAtomic(path.join(snapshotPartialPath, "manifest.json"), { ...manifest, sizeBytesOnDisk });
      await fs.rename(snapshotPartialPath, snapshotFinalPath);

      const finalizedRun: ScanRun = {
        ...run,
        result: {
          ...run.result!,
          durationMs: input.collection.durationMs,
        },
      };
      if (input.collection.status !== "failed") {
        await writeJsonAtomic(path.join(readResult.project.folderPath, "current.json"), {
          projectId: input.projectId,
          siteId: input.siteId,
          currentSnapshotId: snapshotId,
          currentSnapshotPath: snapshotRelativePath,
          updatedAt: input.collection.finishedAt,
        }, (core, value) => core.validateCurrentSnapshotPointer(value));
      }
      await updateAppListCaptureStatus(readResult.project.folderPath, input.selectedAppIds, input.collection.status, input.collection.finishedAt);
      await appendProjectHistoryRun(readResult.project.folderPath, finalizedRun);
      return {
        ok: true,
        code: "OK",
        message: input.collection.status === "failed" ? "Scan failed; partial snapshot data was written for inspection." : "Scan completed and local snapshot was written.",
        run: finalizedRun,
      };
    } catch (error) {
      return { ok: false, code: "IO_ERROR", message: errorMessage(error), run };
    }
  }

  async function getProjectScanHistory(projectId: string): Promise<GetProjectScanHistoryResult> {
    const readResult = await readProjectForProjectId(projectId);
    if (!readResult.ok || !readResult.project) {
      return { ok: false, code: "INVALID_INPUT", message: readResult.message ?? "Project metadata was not found.", runs: [] };
    }

    const historyRead = await readJson<ProjectHistory>(path.join(readResult.project.folderPath, "history.json"), defaultProjectHistory(), "project", true, (core, value) => core.validateProjectHistory(value));
    if (historyRead.issue) {
      return { ok: false, code: "IO_ERROR", message: historyRead.issue.message, runs: [] };
    }

    return { ok: true, code: "OK", message: "Project scan history loaded.", runs: (historyRead.value?.runs ?? []) as ScanRun[] };
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

  async function readProjectForProjectId(projectId: string): Promise<OpenProjectResult> {
    const idValidation = (await coreModulePromise).validateLocalId(projectId, "projectId");
    if (!idValidation.ok) {
      return { ok: false, message: formatValidationIssues(idValidation.issues) };
    }

    const appIndex = await readAppIndex();
    const entry = appIndex.recentProjects.find((item) => item.projectId === projectId);
    if (!entry) {
      return { ok: false, message: "Project is not in the app metadata index." };
    }

    return readProjectAt(entry.folderPath);
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
    return { ...defaultWindowState(false), ...(read.value ?? {}), restored: exists && !read.issue };
  }

  async function writeWindowState(state: WindowStateSnapshot) {
    await ensureDir(appDataRoot);
    await writeJsonAtomic(path.join(appDataRoot, windowStateFile), {
      openProjectTabs: state.openProjectTabs,
      activeTabId: state.activeTabId,
      restored: true,
      scanDraftsByProjectId: state.scanDraftsByProjectId ?? {},
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
    writeKintoneSnapshotScanRun,
    startFixtureScanRun,
    getProjectScanHistory,
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
  return { openProjectTabs: [], activeTabId: "home", restored, scanDraftsByProjectId: {} };
}

function defaultProjectHistory(): ProjectHistory {
  return { schemaVersion, runs: [] };
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

function snapshotAuthSelection(authSelection: Project["authSelection"], profiles: AuthProfile[]): SnapshotAuthSelection {
  if (authSelection.kind === "global_profile") {
    return {
      kind: "global_profile",
      authProfileId: authSelection.authProfileId,
      displayName: profiles.find((profile) => profile.id === authSelection.authProfileId)?.displayName,
    };
  }

  return {
    kind: "project_local",
    displayName: authSelection.displayName,
    username: authSelection.username,
    authType: authSelection.authType,
  };
}

async function appendProjectHistoryRun(projectFolderPath: string, run: ScanRun) {
  const filePath = path.join(projectFolderPath, "history.json");
  const current = (await readJson<ProjectHistory>(filePath, defaultProjectHistory(), "project", false, (core, value) => core.validateProjectHistory(value))).value ?? defaultProjectHistory();
  const next: ProjectHistory = {
    schemaVersion,
    runs: [run, ...current.runs],
  };
  await writeJsonAtomic(filePath, next, (core, value) => core.validateProjectHistory(value));
}

async function writeSnapshotDataFiles(snapshotFolderPath: string, collection: KintoneRestCollectionResult) {
  const captureIndex = [];
  for (const capture of collection.captures) {
    let storedPath: string | undefined;
    if (capture.status === "captured" && capture.payload !== undefined) {
      storedPath = captureDataRelativePath(capture);
      await writeSnapshotJsonAtomic(path.join(snapshotFolderPath, storedPath), {
        schemaVersion,
        _meta: {
          categoryKey: capture.categoryKey,
          endpointKey: capture.endpointKey,
          endpointPath: capture.endpointPath,
          appId: capture.appId,
          kintoneAppId: capture.kintoneAppId,
          state: capture.state,
          collectedAt: capture.finishedAt,
        },
        data: capture.payload,
      });
    }

    const { payload: _payload, ...metadata } = capture;
    captureIndex.push({
      ...metadata,
      ...(storedPath ? { storedPath } : {}),
    });
  }

  return captureIndex;
}

async function writeSnapshotJsonAtomic(filePath: string, value: unknown) {
  const core = await coreModulePromise;
  await ensureDir(path.dirname(filePath));
  const tempPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  await fs.writeFile(tempPath, core.stringifyDeterministic(value, { assertNoSecrets: false }), "utf8");
  await fs.rename(tempPath, filePath);
}

async function writeRedactionLog(filePath: string, collection: KintoneRestCollectionResult) {
  const lines = collection.captures.flatMap((capture) =>
    capture.redactions.map((finding) =>
      JSON.stringify({
        at: capture.finishedAt,
        type: "other",
        appId: capture.appId,
        source: capture.endpointKey,
        path: finding.path,
        reason: finding.reason,
        replacement: finding.replacement,
      }),
    ),
  );
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, lines.length > 0 ? `${lines.join("\n")}\n` : "", "utf8");
}

function captureDataRelativePath(capture: KintoneRestCollectionResult["captures"][number]) {
  const fileName = `${safeSnapshotFileName(capture.endpointKey)}.json`;
  if (capture.appId) {
    return path.join("data", "apps", capture.appId, capture.state, fileName);
  }
  return path.join("data", "site", capture.state, fileName);
}

function safeSnapshotFileName(value: string) {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "capture";
}

async function nextSnapshotId(projectFolderPath: string, startedAt: string) {
  const snapshotsPath = path.join(projectFolderPath, "snapshots");
  const base = `snap_${timestampId(new Date(startedAt))}`;
  let candidate = base;
  for (let suffix = 2; await fileExists(path.join(snapshotsPath, candidate)) || await fileExists(path.join(snapshotsPath, `${candidate}.partial`)); suffix += 1) {
    candidate = `${base}_${suffix}`;
  }
  return candidate;
}

function timestampId(date: Date) {
  return date.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

async function directorySizeBytes(folderPath: string): Promise<number> {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  let total = 0;
  for (const entry of entries) {
    const entryPath = path.join(folderPath, entry.name);
    if (entry.isDirectory()) {
      total += await directorySizeBytes(entryPath);
    } else if (entry.isFile()) {
      total += (await fs.stat(entryPath)).size;
    }
  }
  return total;
}

function countCapturedRecords(collection: KintoneRestCollectionResult) {
  return collection.captures
    .filter((capture) => capture.status === "captured" && capture.endpointKey === "sample-records" && capture.payload && typeof capture.payload === "object")
    .reduce((count, capture) => {
      const records = (capture.payload as { records?: unknown }).records;
      return count + (Array.isArray(records) ? records.length : 0);
    }, 0);
}

async function updateAppListCaptureStatus(projectFolderPath: string, selectedAppIds: string[], status: ScanRun["status"], capturedAt: string) {
  const filePath = path.join(projectFolderPath, "app-list.json");
  const current = (await readJson<ProjectAppList>(filePath, null, "project", true, (core, value) => core.validateProjectAppList(value))).value;
  if (!current) {
    return;
  }

  const selectedIds = new Set(selectedAppIds);
  const captureStatus = status === "completed" ? "in_snapshot" : "last_scan_warning";
  const apps = current.apps.map((app) =>
    selectedIds.has(app.id)
      ? {
          ...app,
          captureStatus,
          lastCapturedAt: capturedAt,
        }
      : app,
  );
  await writeJsonAtomic(filePath, { ...current, apps }, (core, value) => core.validateProjectAppList(value));
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
