import { app, BrowserWindow, ipcMain, net, protocol } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type {
  BridgeResult,
  CredentialStoreStatus,
  FolderSelectionResult,
  OpenFolderRequest,
  PlatformRuntimeInfo,
  SiteTabSnapshot,
  WindowStateSnapshot,
} from "../src/platform/bridgeTypes";

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

  ipcMain.handle("platform:getRuntimeInfo", (): PlatformRuntimeInfo => {
    return {
      appName: app.getName(),
      appVersion: app.getVersion(),
      runtime: "electron",
      runtimeVersion: process.versions.electron ?? "unknown",
      platform: process.platform,
      arch: process.arch,
      isPackaged: app.isPackaged,
      bridgeStatus: "stubbed",
    };
  });

  ipcMain.handle("platform:chooseLocalFolder", (): FolderSelectionResult => {
    return {
      ok: false,
      cancelled: true,
      reason: "Folder selection is intentionally stubbed until local workspace storage is implemented.",
    };
  });

  ipcMain.handle("platform:openLocalFolder", (_event, _request: OpenFolderRequest): BridgeResult => {
    return {
      ok: false,
      code: "NOT_IMPLEMENTED",
      message: "Opening local folders is intentionally stubbed in this desktop shell batch.",
    };
  });

  ipcMain.handle("platform:getWindowState", (): WindowStateSnapshot => {
    return {
      openSiteTabs: [],
      activeTabId: "home",
      restored: false,
    };
  });

  ipcMain.handle("platform:saveWindowState", (_event, _state: WindowStateSnapshot): BridgeResult => {
    return {
      ok: true,
      code: "STUBBED",
      message: "Window state persistence is not wired yet.",
    };
  });

  ipcMain.handle("platform:getOpenSiteTabs", (): SiteTabSnapshot[] => {
    return [];
  });

  ipcMain.handle("platform:saveOpenSiteTabs", (_event, _tabs: SiteTabSnapshot[]): BridgeResult => {
    return {
      ok: true,
      code: "STUBBED",
      message: "Site tab persistence is not wired yet.",
    };
  });

  ipcMain.handle("platform:getCredentialStoreStatus", (): CredentialStoreStatus => {
    return {
      available: false,
      provider: "stub",
      reason: "Credential storage will be implemented with an OS keychain provider in a later batch.",
    };
  });

  platformBridgeHandlersRegistered = true;
}

app.setAppUserModelId("com.kintone-site-discovery.desktop");

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
