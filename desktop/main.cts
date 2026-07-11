import { app, BrowserWindow, Menu, dialog, ipcMain, net, protocol, shell, type OpenDialogOptions } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type {
  BridgeResult,
  CancelKintoneScanRunRequest,
  CancelKintoneScanRunResult,
  CancelKintoneScanDebugSessionRequest,
  CancelKintoneScanDebugSessionResult,
  CreateKintoneScanDebugSessionRequest,
  CreateKintoneScanDebugSessionResult,
  CreateProjectRequest,
  CreateProjectResult,
  CredentialStoreStatus,
  ForgetCredentialRequest,
  ForgetCredentialResult,
  FetchKintoneAppListRequest,
  FetchKintoneAppListResult,
  FinishKintoneScanDebugSessionRequest,
  FinishKintoneScanDebugSessionResult,
  GetActiveKintoneScanRunRequest,
  GetActiveKintoneScanRunResult,
  GetKintoneScanRunProgressRequest,
  GetKintoneScanRunProgressResult,
  GetProjectScanHistoryRequest,
  GetProjectScanHistoryResult,
  FolderSelectionRequest,
  FolderSelectionResult,
  OpenFolderRequest,
  OpenProjectResult,
  PlatformRuntimeInfo,
  ProjectTabSnapshot,
  ResumeKintoneScanRunRequest,
  ResumeKintoneScanRunResult,
  RunNextKintoneScanDebugCommandRequest,
  RunNextKintoneScanDebugCommandResult,
  RemoveAuthProfileRequest,
  RemoveAuthProfileResult,
  RemoveConnectedSiteRequest,
  RemoveConnectedSiteResult,
  RemoveProjectFromAppRequest,
  RemoveProjectFromAppResult,
  SaveAuthProfileResult,
  SaveConnectedSiteResult,
  StoreCredentialRequest,
  StoreCredentialResult,
  StartFixtureScanRunRequest,
  StartFixtureScanRunResult,
  StartKintoneScanRunRequest,
  StartKintoneScanRunResult,
  UpdateProjectAppListRequest,
  UpdateProjectAppListResult,
  UpdateProjectMetadataRequest,
  UpdateProjectMetadataResult,
  ValidateKintoneConnectionRequest,
  ValidateKintoneConnectionResult,
  WorkspaceHomeSnapshot,
  WindowStateSnapshot,
} from "../src/platform/bridgeTypes";
import type { AuthProfile, ConnectedSite } from "../packages/core/src/types.js";
import { createCredentialStore } from "./credentialStore.cjs";
import { createKintoneAccessService } from "./kintoneAccess.cjs";
import { createWorkspaceStorage } from "./workspaceStorage.cjs";

const APP_PROTOCOL = "ksd";
const APP_HOST = "renderer";
const DEV_RENDERER_URL = process.env.KSD_RENDERER_URL;

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;
let platformBridgeHandlersRegistered = false;
let rendererProtocolRegistered = false;
let workspaceStorage: ReturnType<typeof createWorkspaceStorage> | null = null;
let credentialStore: ReturnType<typeof createCredentialStore> | null = null;
let kintoneAccessService: ReturnType<typeof createKintoneAccessService> | null = null;
let lastSelectedProjectFolder: string | null = null;

async function createMainWindow() {
  registerPlatformBridgeHandlers();

  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 1040,
    minHeight: 700,
    title: "Kintone Site Discovery",
    show: false,
    backgroundColor: "#f5f7fb",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  if (DEV_RENDERER_URL) {
    await mainWindow.loadURL(DEV_RENDERER_URL);
    if (process.env.KSD_OPEN_DEVTOOLS === "1") {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
    return;
  }

  await registerRendererProtocol();
  await mainWindow.loadURL(`${APP_PROTOCOL}://${APP_HOST}/`);
}

async function registerRendererProtocol() {
  if (rendererProtocolRegistered) {
    return;
  }

  const rendererRoot = getRendererRoot();

  protocol.handle(APP_PROTOCOL, async (request) => {
    const requestUrl = new URL(request.url);

    if (requestUrl.host !== APP_HOST) {
      return new Response("Unknown app host", { status: 404 });
    }

    const requestedPath = decodeURIComponent(requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname);
    const filePath = path.normalize(path.join(rendererRoot, requestedPath));

    if (!isPathInside(rendererRoot, filePath)) {
      return new Response("Not found", { status: 404 });
    }

    if (await isFile(filePath)) {
      return net.fetch(pathToFileURL(filePath).toString());
    }

    return net.fetch(pathToFileURL(path.join(rendererRoot, "index.html")).toString());
  });

  rendererProtocolRegistered = true;
}

function getRendererRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "renderer");
  }

  return path.resolve(__dirname, "..", "..", "dist");
}

async function isFile(filePath: string) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

function isPathInside(parentPath: string, childPath: string) {
  const relativePath = path.relative(parentPath, childPath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function registerPlatformBridgeHandlers() {
  if (platformBridgeHandlersRegistered) {
    return;
  }

  const storage = getWorkspaceStorage();

  ipcMain.handle("platform:getRuntimeInfo", (): PlatformRuntimeInfo => {
    return {
      appName: app.getName(),
      appVersion: app.getVersion(),
      runtime: "electron",
      runtimeVersion: process.versions.electron ?? "unknown",
      platform: process.platform,
      arch: process.arch,
      isPackaged: app.isPackaged,
      bridgeStatus: "ready",
    };
  });

  ipcMain.handle("platform:chooseLocalFolder", async (_event, request?: FolderSelectionRequest): Promise<FolderSelectionResult> => {
    const defaultPath = await folderDialogDefaultPath(request);
    const options: OpenDialogOptions = {
      title: "Choose a local project folder",
      properties: ["openDirectory", "createDirectory"],
      defaultPath,
    };
    const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);

    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false, cancelled: true };
    }

    lastSelectedProjectFolder = result.filePaths[0];
    return { ok: true, cancelled: false, path: result.filePaths[0] };
  });

  ipcMain.handle("platform:openLocalFolder", async (_event, request: OpenFolderRequest): Promise<BridgeResult> => {
    const validation = await storage.validateOpenLocalFolder(request.path);
    if (!validation.ok) {
      return validation;
    }

    const error = await shell.openPath(path.resolve(request.path));
    if (error) {
      return { ok: false, code: "IO_ERROR", message: error };
    }

    return { ok: true, code: "OK", message: "Folder opened." };
  });

  ipcMain.handle("platform:getWorkspaceHome", (): Promise<WorkspaceHomeSnapshot> => {
    return storage.readWorkspaceHome();
  });

  ipcMain.handle("platform:createProject", (_event, request: CreateProjectRequest): Promise<CreateProjectResult> => {
    return storage.createProject(request);
  });

  ipcMain.handle("platform:openProjectFromFolder", async (): Promise<OpenProjectResult> => {
    const options: OpenDialogOptions = {
      title: "Open Kintone Site Discovery project",
      properties: ["openDirectory"],
    };
    const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);

    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false, message: "Open project was cancelled." };
    }

    return storage.openProject(result.filePaths[0]);
  });

  ipcMain.handle("platform:saveConnectedSite", (_event, site: ConnectedSite): Promise<SaveConnectedSiteResult> => {
    return storage.saveConnectedSite(site);
  });

  ipcMain.handle("platform:saveAuthProfile", (_event, profile: AuthProfile): Promise<SaveAuthProfileResult> => {
    return storage.saveAuthProfile(profile);
  });

  ipcMain.handle("platform:updateProjectMetadata", (_event, request: UpdateProjectMetadataRequest): Promise<UpdateProjectMetadataResult> => {
    return storage.updateProjectMetadata(request);
  });

  ipcMain.handle("platform:updateProjectAppList", (_event, request: UpdateProjectAppListRequest): Promise<UpdateProjectAppListResult> => {
    return storage.updateProjectAppList(request.projectId, request.appSummaries, request.selectedAppIds);
  });

  ipcMain.handle("platform:removeProjectFromApp", (_event, request: RemoveProjectFromAppRequest): Promise<RemoveProjectFromAppResult> => {
    return storage.removeProjectFromApp(request.projectId);
  });

  ipcMain.handle("platform:updateConnectedSite", (_event, site: ConnectedSite): Promise<SaveConnectedSiteResult> => {
    return storage.updateConnectedSite(site);
  });

  ipcMain.handle("platform:removeConnectedSite", (_event, request: RemoveConnectedSiteRequest): Promise<RemoveConnectedSiteResult> => {
    return storage.removeConnectedSite(request.siteId);
  });

  ipcMain.handle("platform:updateAuthProfile", (_event, profile: AuthProfile): Promise<SaveAuthProfileResult> => {
    return storage.updateAuthProfile(profile);
  });

  ipcMain.handle("platform:removeAuthProfile", (_event, request: RemoveAuthProfileRequest): Promise<RemoveAuthProfileResult> => {
    return storage.removeAuthProfile(request.authProfileId);
  });

  ipcMain.handle("platform:getWindowState", (): Promise<WindowStateSnapshot> => {
    return storage.readWindowState();
  });

  ipcMain.handle("platform:saveWindowState", async (_event, state: WindowStateSnapshot): Promise<BridgeResult> => {
    await storage.writeWindowState(state);
    return { ok: true, code: "OK", message: "Window state saved." };
  });

  ipcMain.handle("platform:getOpenProjectTabs", (): Promise<ProjectTabSnapshot[]> => {
    return storage.readOpenProjectTabs();
  });

  ipcMain.handle("platform:saveOpenProjectTabs", async (_event, tabs: ProjectTabSnapshot[]): Promise<BridgeResult> => {
    await storage.writeOpenProjectTabs(tabs);
    return { ok: true, code: "OK", message: "Project tabs saved." };
  });

  ipcMain.handle("platform:getCredentialStoreStatus", (): Promise<CredentialStoreStatus> => {
    return getCredentialStore().getStatus();
  });

  ipcMain.handle("platform:storeCredential", (_event, request: StoreCredentialRequest): Promise<StoreCredentialResult> => {
    return getCredentialStore().storeCredential(request);
  });

  ipcMain.handle("platform:forgetCredential", (_event, request: ForgetCredentialRequest): Promise<ForgetCredentialResult> => {
    return getCredentialStore().forgetCredential(request);
  });

  ipcMain.handle("platform:validateKintoneConnection", (_event, request: ValidateKintoneConnectionRequest): Promise<ValidateKintoneConnectionResult> => {
    return getKintoneAccessService().validateKintoneConnection(request);
  });

  ipcMain.handle("platform:fetchKintoneAppList", (_event, request: FetchKintoneAppListRequest): Promise<FetchKintoneAppListResult> => {
    return getKintoneAccessService().fetchKintoneAppList(request);
  });

  ipcMain.handle("platform:startKintoneScanRun", (_event, request: StartKintoneScanRunRequest): Promise<StartKintoneScanRunResult> => {
    return getKintoneAccessService().startKintoneScanRun(request);
  });

  ipcMain.handle("platform:getKintoneScanRunProgress", (_event, request: GetKintoneScanRunProgressRequest): Promise<GetKintoneScanRunProgressResult> => {
    return getKintoneAccessService().getKintoneScanRunProgress(request);
  });

  ipcMain.handle("platform:getActiveKintoneScanRun", (_event, request: GetActiveKintoneScanRunRequest): Promise<GetActiveKintoneScanRunResult> => {
    return getKintoneAccessService().getActiveKintoneScanRun(request);
  });

  ipcMain.handle("platform:resumeKintoneScanRun", (_event, request: ResumeKintoneScanRunRequest): Promise<ResumeKintoneScanRunResult> => {
    return getKintoneAccessService().resumeKintoneScanRun(request);
  });

  ipcMain.handle("platform:cancelKintoneScanRun", (_event, request: CancelKintoneScanRunRequest): Promise<CancelKintoneScanRunResult> => {
    return getKintoneAccessService().cancelKintoneScanRun(request);
  });

  ipcMain.handle("platform:createKintoneScanDebugSession", (_event, request: CreateKintoneScanDebugSessionRequest): Promise<CreateKintoneScanDebugSessionResult> => {
    return getKintoneAccessService().createKintoneScanDebugSession(request);
  });

  ipcMain.handle("platform:runNextKintoneScanDebugCommand", (_event, request: RunNextKintoneScanDebugCommandRequest): Promise<RunNextKintoneScanDebugCommandResult> => {
    return getKintoneAccessService().runNextKintoneScanDebugCommand(request);
  });

  ipcMain.handle("platform:finishKintoneScanDebugSession", (_event, request: FinishKintoneScanDebugSessionRequest): Promise<FinishKintoneScanDebugSessionResult> => {
    return getKintoneAccessService().finishKintoneScanDebugSession(request);
  });

  ipcMain.handle("platform:cancelKintoneScanDebugSession", (_event, request: CancelKintoneScanDebugSessionRequest): Promise<CancelKintoneScanDebugSessionResult> => {
    return getKintoneAccessService().cancelKintoneScanDebugSession(request);
  });

  ipcMain.handle("platform:startFixtureScanRun", (_event, request: StartFixtureScanRunRequest): Promise<StartFixtureScanRunResult> => {
    return storage.startFixtureScanRun(request);
  });

  ipcMain.handle("platform:getProjectScanHistory", (_event, request: GetProjectScanHistoryRequest): Promise<GetProjectScanHistoryResult> => {
    return storage.getProjectScanHistory(request.projectId);
  });

  platformBridgeHandlersRegistered = true;
}

function getWorkspaceStorage() {
  workspaceStorage ??= createWorkspaceStorage({ appDataRoot: app.getPath("userData") });
  return workspaceStorage;
}

function getCredentialStore() {
  credentialStore ??= createCredentialStore({ appDataRoot: app.getPath("userData") });
  return credentialStore;
}

function getKintoneAccessService() {
  kintoneAccessService ??= createKintoneAccessService({
    storage: getWorkspaceStorage(),
    credentialStore: getCredentialStore(),
    allowDebugSessions: !app.isPackaged,
  });
  return kintoneAccessService;
}

async function folderDialogDefaultPath(request?: FolderSelectionRequest): Promise<string | undefined> {
  const candidates = [request?.defaultPath, lastSelectedProjectFolder].filter((item): item is string => Boolean(item?.trim()));

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    const directory = await existingDirectoryOrParent(resolved);
    if (directory) {
      return directory;
    }
  }

  return undefined;
}

async function existingDirectoryOrParent(folderPath: string): Promise<string | undefined> {
  const direct = await directoryExists(folderPath);
  if (direct) {
    return folderPath;
  }

  const parent = path.dirname(folderPath);
  if (parent !== folderPath && (await directoryExists(parent))) {
    return parent;
  }

  return undefined;
}

async function directoryExists(folderPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(folderPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

app.setAppUserModelId("com.kintone-site-discovery.desktop");
Menu.setApplicationMenu(null);

app.whenReady().then(createMainWindow);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createMainWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
