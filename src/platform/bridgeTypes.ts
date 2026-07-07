export type DesktopRuntime = "electron" | "browser";

export type BridgeStatus = "stubbed" | "fallback";

export interface PlatformRuntimeInfo {
  appName: string;
  appVersion: string;
  runtime: DesktopRuntime;
  runtimeVersion: string;
  platform: string;
  arch: string;
  isPackaged: boolean;
  bridgeStatus: BridgeStatus;
}

export interface FolderSelectionResult {
  ok: boolean;
  cancelled: boolean;
  path?: string;
  reason?: string;
}

export interface OpenFolderRequest {
  path: string;
}

export interface BridgeResult {
  ok: boolean;
  code: "STUBBED" | "FALLBACK" | "UNAVAILABLE" | "NOT_IMPLEMENTED";
  message: string;
}

export interface ProjectTabSnapshot {
  id: string;
  title: string;
  projectId?: string;
  routePath: string;
}

export interface WindowStateSnapshot {
  openProjectTabs: ProjectTabSnapshot[];
  activeTabId: string;
  restored: boolean;
}

export interface CredentialStoreStatus {
  available: boolean;
  provider: "stub" | "windows-credential-manager" | "keychain";
  reason?: string;
}

export interface PlatformBridge {
  getRuntimeInfo(): Promise<PlatformRuntimeInfo>;
  chooseLocalFolder(): Promise<FolderSelectionResult>;
  openLocalFolder(request: OpenFolderRequest): Promise<BridgeResult>;
  getWindowState(): Promise<WindowStateSnapshot>;
  saveWindowState(state: WindowStateSnapshot): Promise<BridgeResult>;
  getOpenProjectTabs(): Promise<ProjectTabSnapshot[]>;
  saveOpenProjectTabs(tabs: ProjectTabSnapshot[]): Promise<BridgeResult>;
  getCredentialStoreStatus(): Promise<CredentialStoreStatus>;
}
