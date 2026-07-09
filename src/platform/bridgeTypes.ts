import type { AppSummary, AuthProfile, ConnectedSite, Project, ProjectAppList, ProjectAuthSelection } from "@kintone-site-discovery/core";

export type DesktopRuntime = "electron" | "browser";

export type BridgeStatus = "ready" | "stubbed" | "fallback";

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

export interface FolderSelectionRequest {
  defaultPath?: string;
}

export interface OpenFolderRequest {
  path: string;
}

export interface BridgeResult {
  ok: boolean;
  code: "OK" | "STUBBED" | "FALLBACK" | "UNAVAILABLE" | "NOT_IMPLEMENTED" | "INVALID_INPUT" | "CONFLICT" | "IO_ERROR";
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

export interface WorkspaceMetadataIssue {
  scope: "app" | "project";
  path?: string;
  code: "missing" | "corrupt_json" | "invalid_metadata" | "io_error";
  message: string;
  recoverable: boolean;
}

export interface WorkspaceHomeSnapshot {
  schemaVersion: number;
  appDataRoot: string;
  defaultProjectsRoot: string;
  projects: Project[];
  connectedSites: ConnectedSite[];
  authProfiles: AuthProfile[];
  projectAppListsByProjectId: Record<string, ProjectAppList>;
  errors: WorkspaceMetadataIssue[];
}

export interface CreateProjectRequest {
  name: string;
  folderPath: string;
  connectedSite: ConnectedSite;
  authSelection: ProjectAuthSelection;
  authProfile?: AuthProfile;
  appSummaries?: AppSummary[];
}

export interface CreateProjectResult {
  ok: boolean;
  project?: Project;
  connectedSite?: ConnectedSite;
  appList?: ProjectAppList;
  appSummaries?: AppSummary[];
  errors?: WorkspaceMetadataIssue[];
  message?: string;
}

export interface OpenProjectResult {
  ok: boolean;
  project?: Project;
  connectedSite?: ConnectedSite;
  appList?: ProjectAppList;
  appSummaries?: AppSummary[];
  errors?: WorkspaceMetadataIssue[];
  message?: string;
}

export interface SaveConnectedSiteResult extends BridgeResult {
  connectedSite?: ConnectedSite;
}

export interface SaveAuthProfileResult extends BridgeResult {
  authProfile?: AuthProfile;
}

export interface UpdateProjectMetadataRequest {
  projectId: string;
  name: string;
  siteId: string;
  authSelection: ProjectAuthSelection;
}

export interface UpdateProjectMetadataResult extends BridgeResult {
  project?: Project;
  connectedSite?: ConnectedSite;
  errors?: WorkspaceMetadataIssue[];
}

export interface RemoveProjectFromAppRequest {
  projectId: string;
}

export interface RemoveProjectFromAppResult extends BridgeResult {
  projectId: string;
}

export interface RemoveConnectedSiteRequest {
  siteId: string;
}

export interface RemoveConnectedSiteResult extends BridgeResult {
  siteId: string;
}

export interface RemoveAuthProfileRequest {
  authProfileId: string;
}

export interface RemoveAuthProfileResult extends BridgeResult {
  authProfileId: string;
}

export interface CredentialStoreStatus {
  available: boolean;
  provider: "stub" | "windows-credential-manager" | "keychain";
  reason?: string;
}

export interface PlatformBridge {
  getRuntimeInfo(): Promise<PlatformRuntimeInfo>;
  chooseLocalFolder(request?: FolderSelectionRequest): Promise<FolderSelectionResult>;
  openLocalFolder(request: OpenFolderRequest): Promise<BridgeResult>;
  getWorkspaceHome(): Promise<WorkspaceHomeSnapshot>;
  createProject(request: CreateProjectRequest): Promise<CreateProjectResult>;
  openProjectFromFolder(): Promise<OpenProjectResult>;
  saveConnectedSite(site: ConnectedSite): Promise<SaveConnectedSiteResult>;
  saveAuthProfile(profile: AuthProfile): Promise<SaveAuthProfileResult>;
  updateProjectMetadata(request: UpdateProjectMetadataRequest): Promise<UpdateProjectMetadataResult>;
  removeProjectFromApp(request: RemoveProjectFromAppRequest): Promise<RemoveProjectFromAppResult>;
  updateConnectedSite(site: ConnectedSite): Promise<SaveConnectedSiteResult>;
  removeConnectedSite(request: RemoveConnectedSiteRequest): Promise<RemoveConnectedSiteResult>;
  updateAuthProfile(profile: AuthProfile): Promise<SaveAuthProfileResult>;
  removeAuthProfile(request: RemoveAuthProfileRequest): Promise<RemoveAuthProfileResult>;
  getWindowState(): Promise<WindowStateSnapshot>;
  saveWindowState(state: WindowStateSnapshot): Promise<BridgeResult>;
  getOpenProjectTabs(): Promise<ProjectTabSnapshot[]>;
  saveOpenProjectTabs(tabs: ProjectTabSnapshot[]): Promise<BridgeResult>;
  getCredentialStoreStatus(): Promise<CredentialStoreStatus>;
}
