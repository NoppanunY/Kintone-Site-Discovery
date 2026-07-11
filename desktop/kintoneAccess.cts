import {
  createKintoneReadOnlyClient,
  buildKintoneScanCollectorGroups,
  calculateKintoneScanProgress,
  finalizeRestMetadataCollection,
  formatKintoneScanLogLine,
  planRestMetadataCommands,
  type AppSummary,
  type KintoneRestCapture,
  type KintoneRestCommand,
  type KintoneScanErrorMode,
  type KintoneScanLogLine,
  type KintoneScanSessionStatus,
  type KintoneRestCollectionInput,
  type KintoneRestCollectionResult,
  type KintoneAppListResult,
  type KintoneConnectionResult,
  type KintoneConnectionStatus,
  type KintonePasswordAuth,
  type Project,
  type ProjectAppList,
  type SnapshotAuthSelection,
} from "../packages/core/src/index.js";
import type {
  BridgeResult,
  CancelKintoneScanRunRequest,
  CancelKintoneScanRunResult,
  CancelKintoneScanDebugSessionRequest,
  CancelKintoneScanDebugSessionResult,
  CreateKintoneScanDebugSessionRequest,
  CreateKintoneScanDebugSessionResult,
  FetchKintoneAppListRequest,
  FetchKintoneAppListResult,
  FinishKintoneScanDebugSessionRequest,
  FinishKintoneScanDebugSessionResult,
  GetActiveKintoneScanRunRequest,
  GetActiveKintoneScanRunResult,
  GetKintoneScanRunProgressRequest,
  GetKintoneScanRunProgressResult,
  KintoneScanProgressState,
  KintoneScanDebugSessionState,
  ResumeKintoneScanRunRequest,
  ResumeKintoneScanRunResult,
  RunNextKintoneScanDebugCommandRequest,
  RunNextKintoneScanDebugCommandResult,
  StartKintoneScanRunRequest,
  StartKintoneScanRunResult,
  UpdateProjectAppListResult,
  ValidateKintoneConnectionRequest,
  ValidateKintoneConnectionResult,
  WorkspaceHomeSnapshot,
} from "../src/platform/bridgeTypes";

type KintoneBridgeStatus = ValidateKintoneConnectionResult["status"];

interface WorkspaceStorageAccess {
  readWorkspaceHome(): Promise<WorkspaceHomeSnapshot>;
  updateProjectAppList(projectId: string, appSummaries: AppSummary[], selectedAppIds: string[], appListFetchedAt?: string): Promise<UpdateProjectAppListResult>;
  writeKintoneSnapshotScanRun(input: WriteKintoneSnapshotScanRunInput): Promise<StartKintoneScanRunResult>;
}

interface CredentialStoreAccess {
  readCredentialForInternalUse(keychainRef: string): Promise<BridgeResult & { credential?: string }>;
}

interface KintoneReadOnlyClient {
  validateConnection(): Promise<KintoneConnectionResult>;
  fetchApps(): Promise<KintoneAppListResult>;
  collectRestMetadata(input: KintoneRestCollectionInput): Promise<KintoneRestCollectionResult>;
  executeRestMetadataCommand(command: KintoneRestCommand): Promise<KintoneRestCapture>;
}

interface ResolvedProjectAccess {
  home: WorkspaceHomeSnapshot;
  project: Project;
  domain: string;
  auth: KintonePasswordAuth;
}

export interface WriteKintoneSnapshotScanRunInput {
  projectId: string;
  siteId: string;
  siteDomain: string;
  authSelection: SnapshotAuthSelection;
  presetId: StartKintoneScanRunRequest["presetId"];
  selectedAppIds: string[];
  enabledCategoryKeys: string[];
  sensitiveOptions: StartKintoneScanRunRequest["sensitiveOptions"];
  selectedApps: AppSummary[];
  collection: KintoneRestCollectionResult;
}

interface KintoneAccessServiceOptions {
  storage: WorkspaceStorageAccess;
  credentialStore: CredentialStoreAccess;
  createClient?: (options: { domain: string; auth: KintonePasswordAuth }) => KintoneReadOnlyClient;
  allowDebugSessions?: boolean;
}

interface KintoneScanDebugSession {
  sessionId: string;
  projectId: string;
  siteId: string;
  siteDomain: string;
  authSelection: SnapshotAuthSelection;
  presetId: StartKintoneScanRunRequest["presetId"];
  selectedAppIds: string[];
  enabledCategoryKeys: string[];
  sensitiveOptions: StartKintoneScanRunRequest["sensitiveOptions"];
  selectedApps: AppSummary[];
  commands: KintoneRestCommand[];
  captures: KintoneRestCapture[];
  cursor: number;
  startedAt: string;
  client: KintoneReadOnlyClient;
  running: boolean;
}

interface KintoneScanRunSession {
  sessionId: string;
  projectId: string;
  siteId: string;
  siteDomain: string;
  authSelection: SnapshotAuthSelection;
  presetId: StartKintoneScanRunRequest["presetId"];
  selectedAppIds: string[];
  enabledCategoryKeys: string[];
  sensitiveOptions: StartKintoneScanRunRequest["sensitiveOptions"];
  selectedApps: AppSummary[];
  commands: KintoneRestCommand[];
  captures: KintoneRestCapture[];
  cursor: number;
  startedAt: string;
  finishedAt?: string;
  client: KintoneReadOnlyClient;
  status: KintoneScanSessionStatus;
  errorMode: KintoneScanErrorMode;
  currentCommand?: KintoneRestCommand;
  run?: StartKintoneScanRunResult["run"];
  logLines: KintoneScanLogLine[];
  cancelRequested: boolean;
  workerActive: boolean;
  message?: string;
}

export function createKintoneAccessService({ storage, credentialStore, createClient = createKintoneReadOnlyClient, allowDebugSessions = true }: KintoneAccessServiceOptions) {
  const debugSessions = new Map<string, KintoneScanDebugSession>();
  const scanSessions = new Map<string, KintoneScanRunSession>();
  const activeScanSessionsByProjectId = new Map<string, string>();

  async function validateKintoneConnection(request: ValidateKintoneConnectionRequest): Promise<ValidateKintoneConnectionResult> {
    const access = await resolveProjectAccess(request.projectId);
    if (!access.ok) {
      return access.result;
    }

    const result = await createClient({ domain: access.value.domain, auth: access.value.auth }).validateConnection();
    return {
      ok: result.status === "connected",
      code: bridgeCodeForStatus(result.status),
      status: result.status,
      checkedAt: result.checkedAt,
      httpStatus: result.httpStatus,
      message: result.message,
    };
  }

  async function fetchKintoneAppList(request: FetchKintoneAppListRequest): Promise<FetchKintoneAppListResult> {
    const access = await resolveProjectAccess(request.projectId);
    if (!access.ok) {
      return access.result;
    }

    const result = await createClient({ domain: access.value.domain, auth: access.value.auth }).fetchApps();
    if (result.status !== "connected") {
      return {
        ok: false,
        code: bridgeCodeForStatus(result.status),
        status: result.status,
        fetchedAt: result.fetchedAt,
        httpStatus: result.httpStatus,
        message: result.message,
      };
    }

    const previousAppList = access.value.home.projectAppListsByProjectId[request.projectId];
    const selectedAppIds = selectedIdsForFetchedApps(result.apps, previousAppList);
    const update = await storage.updateProjectAppList(request.projectId, result.apps, selectedAppIds, result.fetchedAt);
    if (!update.ok || !update.appList) {
      return {
        ok: false,
        code: update.code,
        status: "connected",
        fetchedAt: result.fetchedAt,
        apps: result.apps,
        message: update.message,
      };
    }

    return {
      ok: true,
      code: "OK",
      status: "connected",
      fetchedAt: result.fetchedAt,
      apps: result.apps,
      appList: update.appList,
      httpStatus: result.httpStatus,
      message: result.message,
    };
  }

  async function startKintoneScanRun(request: StartKintoneScanRunRequest): Promise<StartKintoneScanRunResult> {
    const access = await resolveProjectAccess(request.projectId);
    if (!access.ok) {
      return access.result;
    }
    if (request.selectedAppIds.length === 0) {
      return { ok: false, code: "INVALID_INPUT", message: "Choose at least one app before starting a scan." };
    }

    const appList = access.value.home.projectAppListsByProjectId[request.projectId];
    const selectedApps = selectedAppsForIds(request.selectedAppIds, appList);
    if (!appList || selectedApps.length !== request.selectedAppIds.length) {
      const availableIds = new Set(appList?.apps.map((app) => app.id) ?? []);
      const missing = request.selectedAppIds.find((appId) => !availableIds.has(appId));
      return { ok: false, code: "INVALID_INPUT", message: `Selected app ID is not present in the project app list: ${missing ?? "unknown"}` };
    }

    const authSelection = snapshotAuthSelection(access.value.project.authSelection, access.value.home);
    const startedAt = toIso(new Date());
    const plan = planRestMetadataCommands(
      {
        selectedApps,
        enabledCategoryKeys: request.enabledCategoryKeys,
        sensitiveOptions: request.sensitiveOptions,
      },
      startedAt,
    );
    const session: KintoneScanRunSession = {
      sessionId: createScanSessionId(),
      projectId: request.projectId,
      siteId: access.value.project.siteId,
      siteDomain: access.value.domain,
      authSelection,
      presetId: request.presetId,
      selectedAppIds: request.selectedAppIds,
      enabledCategoryKeys: request.enabledCategoryKeys,
      sensitiveOptions: request.sensitiveOptions,
      selectedApps,
      commands: plan.commands,
      captures: [...plan.skippedCaptures],
      cursor: 0,
      startedAt,
      client: createClient({ domain: access.value.domain, auth: access.value.auth }),
      status: "running",
      errorMode: request.errorMode ?? "pause_on_error",
      logLines: [],
      cancelRequested: false,
      workerActive: false,
    };

    scanSessions.set(session.sessionId, session);
    activeScanSessionsByProjectId.set(session.projectId, session.sessionId);
    addScanLog(session, "run", `created scan plan: ${session.commands.length} REST command${session.commands.length === 1 ? "" : "s"} for ${selectedApps.length} app${selectedApps.length === 1 ? "" : "s"}`);
    for (const skipped of plan.skippedCaptures) {
      addScanLog(session, "warn", `skipped ${skipped.label}: ${skipped.message ?? "not available in this phase"}`);
    }
    void runKintoneScanSession(session.sessionId);

    return {
      ok: true,
      code: "OK",
      message: "Scan session started.",
      sessionId: session.sessionId,
      progress: scanProgressState(session),
    };
  }

  async function getKintoneScanRunProgress(request: GetKintoneScanRunProgressRequest): Promise<GetKintoneScanRunProgressResult> {
    const session = scanSessions.get(request.sessionId);
    if (!session) {
      return { ok: false, code: "INVALID_INPUT", message: "Scan session was not found." };
    }

    return { ok: true, code: "OK", message: "Scan session progress loaded.", progress: scanProgressState(session) };
  }

  async function getActiveKintoneScanRun(request: GetActiveKintoneScanRunRequest): Promise<GetActiveKintoneScanRunResult> {
    const sessionId = activeScanSessionsByProjectId.get(request.projectId);
    const session = sessionId ? scanSessions.get(sessionId) : undefined;
    if (!session || session.status === "cancelled") {
      return { ok: false, code: "UNAVAILABLE", message: "No active scan session is available for this project." };
    }

    return { ok: true, code: "OK", message: "Active scan session loaded.", progress: scanProgressState(session) };
  }

  async function resumeKintoneScanRun(request: ResumeKintoneScanRunRequest): Promise<ResumeKintoneScanRunResult> {
    const session = scanSessions.get(request.sessionId);
    if (!session) {
      return { ok: false, code: "INVALID_INPUT", message: "Scan session was not found." };
    }
    if (session.status !== "paused") {
      return { ok: true, code: "OK", message: "Scan session is not paused.", progress: scanProgressState(session) };
    }

    session.status = "running";
    session.message = undefined;
    addScanLog(session, "run", "resuming scan after paused error");
    void runKintoneScanSession(session.sessionId);
    return { ok: true, code: "OK", message: "Scan session resumed.", progress: scanProgressState(session) };
  }

  async function cancelKintoneScanRun(request: CancelKintoneScanRunRequest): Promise<CancelKintoneScanRunResult> {
    const session = scanSessions.get(request.sessionId);
    if (!session) {
      return { ok: false, code: "INVALID_INPUT", message: "Scan session was not found." };
    }

    session.cancelRequested = true;
    session.status = "cancelled";
    session.currentCommand = undefined;
    session.message = "Scan cancelled. No snapshot was written.";
    activeScanSessionsByProjectId.delete(session.projectId);
    addScanLog(session, "warn", "scan cancelled by user; no snapshot will be written");
    return { ok: true, code: "OK", message: "Scan session cancelled. No snapshot was written.", progress: scanProgressState(session) };
  }

  async function createKintoneScanDebugSession(request: CreateKintoneScanDebugSessionRequest): Promise<CreateKintoneScanDebugSessionResult> {
    if (!allowDebugSessions) {
      return debugSessionUnavailable();
    }

    const access = await resolveProjectAccess(request.projectId);
    if (!access.ok) {
      return access.result;
    }
    if (request.selectedAppIds.length === 0) {
      return { ok: false, code: "INVALID_INPUT", message: "Choose at least one app before starting a step scan." };
    }

    const appList = access.value.home.projectAppListsByProjectId[request.projectId];
    const selectedApps = selectedAppsForIds(request.selectedAppIds, appList);
    if (!appList || selectedApps.length !== request.selectedAppIds.length) {
      const availableIds = new Set(appList?.apps.map((app) => app.id) ?? []);
      const missing = request.selectedAppIds.find((appId) => !availableIds.has(appId));
      return { ok: false, code: "INVALID_INPUT", message: `Selected app ID is not present in the project app list: ${missing ?? "unknown"}` };
    }

    const startedAt = toIso(new Date());
    const plan = planRestMetadataCommands(
      {
        selectedApps,
        enabledCategoryKeys: request.enabledCategoryKeys,
        sensitiveOptions: request.sensitiveOptions,
      },
      startedAt,
    );
    const session: KintoneScanDebugSession = {
      sessionId: createDebugSessionId(),
      projectId: request.projectId,
      siteId: access.value.project.siteId,
      siteDomain: access.value.domain,
      authSelection: snapshotAuthSelection(access.value.project.authSelection, access.value.home),
      presetId: request.presetId,
      selectedAppIds: request.selectedAppIds,
      enabledCategoryKeys: request.enabledCategoryKeys,
      sensitiveOptions: request.sensitiveOptions,
      selectedApps,
      commands: plan.commands,
      captures: [...plan.skippedCaptures],
      cursor: 0,
      startedAt,
      client: createClient({ domain: access.value.domain, auth: access.value.auth }),
      running: false,
    };

    debugSessions.set(session.sessionId, session);
    return {
      ok: true,
      code: "OK",
      message: "Step scan session created. No kintone REST request has been run yet.",
      session: debugSessionState(session),
    };
  }

  async function runNextKintoneScanDebugCommand(request: RunNextKintoneScanDebugCommandRequest): Promise<RunNextKintoneScanDebugCommandResult> {
    if (!allowDebugSessions) {
      return debugSessionUnavailable();
    }

    const session = debugSessions.get(request.sessionId);
    if (!session) {
      return { ok: false, code: "INVALID_INPUT", message: "Step scan session was not found." };
    }
    if (session.running) {
      return { ok: false, code: "CONFLICT", message: "A step scan command is already running for this session.", session: debugSessionState(session) };
    }

    const command = session.commands[session.cursor];
    if (!command) {
      return { ok: true, code: "OK", message: "No step scan commands remain.", session: debugSessionState(session) };
    }

    session.running = true;
    try {
      const capture = await session.client.executeRestMetadataCommand(command);
      session.captures.push(capture);
      session.cursor += 1;
      return {
        ok: true,
        code: "OK",
        message: capture.status === "failed" ? "Step command failed; continuing is allowed for inspection." : "Step command captured.",
        command,
        capture,
        session: debugSessionState(session),
      };
    } finally {
      session.running = false;
    }
  }

  async function finishKintoneScanDebugSession(request: FinishKintoneScanDebugSessionRequest): Promise<FinishKintoneScanDebugSessionResult> {
    if (!allowDebugSessions) {
      return debugSessionUnavailable();
    }

    const session = debugSessions.get(request.sessionId);
    if (!session) {
      return { ok: false, code: "INVALID_INPUT", message: "Step scan session was not found." };
    }
    if (session.cursor < session.commands.length) {
      return { ok: false, code: "INVALID_INPUT", message: "Run every planned command before saving the step scan snapshot." };
    }

    const collection = finalizeRestMetadataCollection({
      startedAt: session.startedAt,
      finishedAt: toIso(new Date()),
      selectedApps: session.selectedApps,
      captures: session.captures,
    });
    const result = await storage.writeKintoneSnapshotScanRun({
      projectId: session.projectId,
      siteId: session.siteId,
      siteDomain: session.siteDomain,
      authSelection: session.authSelection,
      presetId: session.presetId,
      selectedAppIds: session.selectedAppIds,
      enabledCategoryKeys: session.enabledCategoryKeys,
      sensitiveOptions: session.sensitiveOptions,
      selectedApps: session.selectedApps,
      collection,
    });

    if (result.ok) {
      debugSessions.delete(session.sessionId);
    }

    return result;
  }

  async function cancelKintoneScanDebugSession(request: CancelKintoneScanDebugSessionRequest): Promise<CancelKintoneScanDebugSessionResult> {
    if (!allowDebugSessions) {
      return debugSessionUnavailable();
    }

    debugSessions.delete(request.sessionId);
    return {
      ok: true,
      code: "OK",
      message: "Step scan session cancelled. No snapshot was written.",
      sessionId: request.sessionId,
    };
  }

  async function runKintoneScanSession(sessionId: string): Promise<void> {
    const session = scanSessions.get(sessionId);
    if (!session || session.workerActive || session.status === "cancelled") {
      return;
    }

    session.workerActive = true;
    try {
      while (session.cursor < session.commands.length) {
        if (session.cancelRequested) {
          session.status = "cancelled";
          session.currentCommand = undefined;
          return;
        }

        const command = session.commands[session.cursor];
        session.currentCommand = command;
        session.status = "running";
        const startedAt = Date.now();
        addScanLog(session, "run", `GET ${command.endpointPath} · app ${command.kintoneAppId} · ${command.categoryKey} · ${command.state}`, command);
        const capture = await session.client.executeRestMetadataCommand(command);
        const durationMs = Math.max(0, Date.now() - startedAt);
        session.captures.push(capture);
        session.cursor += 1;
        session.currentCommand = undefined;
        addScanLog(
          session,
          capture.status === "failed" ? "err" : "ok",
          `${capture.status === "failed" ? "failed" : "captured"} ${command.method} ${command.endpointPath} · HTTP ${capture.httpStatus ?? "n/a"} · ${durationMs}ms · redactions ${capture.redactions.length}`,
          command,
        );

        if (capture.status === "failed" && session.errorMode === "pause_on_error") {
          session.status = "paused";
          session.message = capture.message ?? "A REST command failed. Review the log before continuing.";
          addScanLog(session, "warn", "scan paused after API error; waiting for user action", command);
          return;
        }
      }

      await finishKintoneScanRunSession(session);
    } catch (error) {
      session.status = "failed";
      session.currentCommand = undefined;
      session.finishedAt = toIso(new Date());
      session.message = errorMessage(error);
      addScanLog(session, "err", `scan worker failed: ${errorMessage(error)}`);
    } finally {
      session.workerActive = false;
    }
  }

  async function finishKintoneScanRunSession(session: KintoneScanRunSession): Promise<void> {
    if (session.cancelRequested || session.status === "cancelled") {
      session.status = "cancelled";
      session.currentCommand = undefined;
      return;
    }

    session.status = "saving";
    session.currentCommand = undefined;
    addScanLog(session, "run", "writing local snapshot and scan history");
    const finishedAt = toIso(new Date());
    const collection = finalizeRestMetadataCollection({
      startedAt: session.startedAt,
      finishedAt,
      selectedApps: session.selectedApps,
      captures: session.captures,
    });
    const result = await storage.writeKintoneSnapshotScanRun({
      projectId: session.projectId,
      siteId: session.siteId,
      siteDomain: session.siteDomain,
      authSelection: session.authSelection,
      presetId: session.presetId,
      selectedAppIds: session.selectedAppIds,
      enabledCategoryKeys: session.enabledCategoryKeys,
      sensitiveOptions: session.sensitiveOptions,
      selectedApps: session.selectedApps,
      collection,
    });

    session.finishedAt = finishedAt;
    if (!result.ok || !result.run) {
      session.status = "failed";
      session.message = result.message;
      addScanLog(session, "err", `snapshot write failed: ${result.message}`);
      return;
    }

    session.run = result.run;
    session.status = result.run.status === "failed" ? "failed" : "completed";
    session.message = result.message;
    addScanLog(session, result.run.status === "failed" ? "warn" : "ok", `snapshot saved as ${result.run.snapshotId ?? "partial snapshot"} · run ${result.run.status}`);
  }

  async function resolveProjectAccess(projectId: string): Promise<{ ok: true; value: ResolvedProjectAccess } | { ok: false; result: ValidateKintoneConnectionResult }> {
    const home = await storage.readWorkspaceHome();
    const project = home.projects.find((item) => item.id === projectId);
    if (!project) {
      return noAccess("INVALID_INPUT", "unreachable", "Project metadata was not found.");
    }

    const site = home.connectedSites.find((item) => item.id === project.siteId);
    if (!site) {
      return noAccess("INVALID_INPUT", "unreachable", "Connected site metadata was not found for this project.");
    }

    const authSelection = project.authSelection;
    let username: string;
    let keychainRef: string | undefined;

    if (authSelection.kind === "global_profile") {
      const profile = home.authProfiles.find((item) => item.id === authSelection.authProfileId);
      if (!profile) {
        return noAccess("INVALID_INPUT", "no_credential", "Auth profile metadata was not found for this project.");
      }
      if (profile.credentialStatus !== "saved") {
        return noAccess("UNAVAILABLE", "no_credential", "Auth profile does not have a saved credential.");
      }
      username = profile.username;
      keychainRef = profile.keychainRef;
    } else {
      if (authSelection.credentialStatus !== "saved" || !authSelection.keychainRef) {
        return noAccess("UNAVAILABLE", "no_credential", "Project-local auth does not have a saved credential.");
      }
      username = authSelection.username;
      keychainRef = authSelection.keychainRef;
    }

    const credentialResult = await credentialStore.readCredentialForInternalUse(keychainRef);
    if (!credentialResult.ok || !credentialResult.credential) {
      return noAccess(credentialResult.code, "no_credential", credentialResult.message || "Saved credential could not be loaded.");
    }

    return {
      ok: true,
      value: {
        home,
        project,
        domain: site.domain,
        auth: {
          username,
          password: credentialResult.credential,
        },
      },
    };
  }

  return {
    validateKintoneConnection,
    fetchKintoneAppList,
    startKintoneScanRun,
    getKintoneScanRunProgress,
    getActiveKintoneScanRun,
    resumeKintoneScanRun,
    cancelKintoneScanRun,
    createKintoneScanDebugSession,
    runNextKintoneScanDebugCommand,
    finishKintoneScanDebugSession,
    cancelKintoneScanDebugSession,
  };
}

function selectedIdsForFetchedApps(apps: AppSummary[], previousAppList: ProjectAppList | undefined) {
  const availableIds = new Set(apps.map((app) => app.id));
  if (!previousAppList || previousAppList.apps.length === 0) {
    return apps.map((app) => app.id);
  }

  return (previousAppList.selectedAppIds ?? previousAppList.apps.map((app) => app.id)).filter((appId) => availableIds.has(appId));
}

function selectedAppsForIds(selectedAppIds: string[], appList: ProjectAppList | undefined) {
  const appsById = new Map((appList?.apps ?? []).map((app) => [app.id, app]));
  return selectedAppIds.map((appId) => appsById.get(appId)).filter((app): app is AppSummary => Boolean(app));
}

function snapshotAuthSelection(authSelection: Project["authSelection"], home: WorkspaceHomeSnapshot): SnapshotAuthSelection {
  if (authSelection.kind === "global_profile") {
    return {
      kind: "global_profile",
      authProfileId: authSelection.authProfileId,
      displayName: home.authProfiles.find((profile) => profile.id === authSelection.authProfileId)?.displayName,
    };
  }

  return {
    kind: "project_local",
    displayName: authSelection.displayName,
    username: authSelection.username,
    authType: authSelection.authType,
  };
}

function debugSessionState(session: KintoneScanDebugSession): KintoneScanDebugSessionState {
  return {
    sessionId: session.sessionId,
    commands: session.commands,
    captures: session.captures,
    nextCommand: session.commands[session.cursor],
    completedCount: session.cursor,
    totalCount: session.commands.length,
    done: session.cursor >= session.commands.length,
  };
}

function scanProgressState(session: KintoneScanRunSession): KintoneScanProgressState {
  const summary = calculateKintoneScanProgress(session.commands, session.captures, session.status);
  return {
    sessionId: session.sessionId,
    projectId: session.projectId,
    siteId: session.siteId,
    status: session.status,
    errorMode: session.errorMode,
    commands: session.commands,
    captures: session.captures,
    collectorGroups: buildKintoneScanCollectorGroups(session.commands, session.captures, session.currentCommand),
    logLines: session.logLines,
    currentCommand: session.currentCommand,
    nextCommand: session.commands[session.cursor],
    completedCount: summary.completedCount,
    totalCount: summary.totalCount,
    progressPercent: summary.progressPercent,
    done: session.status === "completed" || session.status === "failed" || session.status === "cancelled",
    run: session.run,
    message: session.message,
  };
}

function addScanLog(session: KintoneScanRunSession, tone: KintoneScanLogLine["tone"], message: string, command?: KintoneRestCommand) {
  session.logLines.push(
    formatKintoneScanLogLine({
      id: `${session.sessionId}_log_${session.logLines.length + 1}`,
      at: toIso(new Date()),
      tone,
      message,
      command,
    }),
  );
}

function debugSessionUnavailable() {
  return {
    ok: false as const,
    code: "UNAVAILABLE" as const,
    message: "Step scan debug sessions are available only in the unpackaged desktop dev runtime.",
  };
}

function createDebugSessionId() {
  return `scan_debug_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function createScanSessionId() {
  return `scan_run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(date: Date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function noAccess(code: BridgeResult["code"], status: KintoneBridgeStatus, message: string): { ok: false; result: ValidateKintoneConnectionResult } {
  return {
    ok: false,
    result: {
      ok: false,
      code,
      status,
      message,
    },
  };
}

function bridgeCodeForStatus(status: KintoneConnectionStatus): BridgeResult["code"] {
  if (status === "connected") {
    return "OK";
  }
  if (status === "auth_failed" || status === "permission_denied" || status === "invalid_response") {
    return "INVALID_INPUT";
  }
  return "IO_ERROR";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
