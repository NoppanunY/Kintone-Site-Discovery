import type {
  AppSummary,
  AuthProfile,
  ConnectedSite,
  CredentialStatus,
  FixtureScanOutcome,
  KintoneRestCapture,
  KintoneRestCommand,
  KintoneConnectionStatus,
  KintoneScanCollectorGroup,
  KintoneScanErrorMode,
  KintoneScanLogLine,
  KintoneScanSessionStatus,
  PresetId,
  Project,
  ProjectAppList,
  ProjectAuthSelection,
  ProjectScanDraftSnapshot,
  ScanRun,
  SensitiveCaptureOption,
} from "@kintone-site-discovery/core";

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
  scanDraftsByProjectId?: Record<string, ProjectScanDraftSnapshot>;
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

export interface UpdateProjectAppListRequest {
  projectId: string;
  appSummaries: AppSummary[];
  selectedAppIds: string[];
}

export interface UpdateProjectAppListResult extends BridgeResult {
  appList?: ProjectAppList;
}

export type KintoneBridgeConnectionStatus = KintoneConnectionStatus | "no_credential";

export interface ValidateKintoneConnectionRequest {
  projectId: string;
}

export interface ValidateKintoneConnectionResult extends BridgeResult {
  status: KintoneBridgeConnectionStatus;
  checkedAt?: string;
  httpStatus?: number;
}

export interface FetchKintoneAppListRequest {
  projectId: string;
}

export interface FetchKintoneAppListResult extends BridgeResult {
  status: KintoneBridgeConnectionStatus;
  fetchedAt?: string;
  apps?: AppSummary[];
  appList?: ProjectAppList;
  httpStatus?: number;
}

export interface StartFixtureScanRunRequest {
  projectId: string;
  presetId: PresetId;
  selectedAppIds: string[];
  enabledCategoryKeys: string[];
  sensitiveOptions: SensitiveCaptureOption[];
  outcome?: FixtureScanOutcome;
}

export interface StartFixtureScanRunResult extends BridgeResult {
  run?: ScanRun;
}

export interface StartKintoneScanRunRequest {
  projectId: string;
  presetId: PresetId;
  selectedAppIds: string[];
  enabledCategoryKeys: string[];
  sensitiveOptions: SensitiveCaptureOption[];
  errorMode?: KintoneScanErrorMode;
}

export interface StartKintoneScanRunResult extends BridgeResult {
  sessionId?: string;
  progress?: KintoneScanProgressState;
  run?: ScanRun;
}

export type CreateKintoneScanDebugSessionRequest = StartKintoneScanRunRequest;

export interface KintoneScanProgressState {
  sessionId: string;
  projectId: string;
  siteId: string;
  status: KintoneScanSessionStatus;
  errorMode: KintoneScanErrorMode;
  commands: KintoneRestCommand[];
  captures: KintoneRestCapture[];
  collectorGroups: KintoneScanCollectorGroup[];
  logLines: KintoneScanLogLine[];
  currentCommand?: KintoneRestCommand;
  nextCommand?: KintoneRestCommand;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  done: boolean;
  run?: ScanRun;
  message?: string;
}

export interface GetKintoneScanRunProgressRequest {
  sessionId: string;
}

export interface GetKintoneScanRunProgressResult extends BridgeResult {
  progress?: KintoneScanProgressState;
}

export interface GetActiveKintoneScanRunRequest {
  projectId: string;
}

export interface GetActiveKintoneScanRunResult extends BridgeResult {
  progress?: KintoneScanProgressState;
}

export interface ResumeKintoneScanRunRequest {
  sessionId: string;
}

export interface ResumeKintoneScanRunResult extends BridgeResult {
  progress?: KintoneScanProgressState;
}

export interface CancelKintoneScanRunRequest {
  sessionId: string;
}

export interface CancelKintoneScanRunResult extends BridgeResult {
  progress?: KintoneScanProgressState;
}

export interface KintoneScanDebugSessionState {
  sessionId: string;
  commands: KintoneRestCommand[];
  captures: KintoneRestCapture[];
  nextCommand?: KintoneRestCommand;
  completedCount: number;
  totalCount: number;
  done: boolean;
}

export interface CreateKintoneScanDebugSessionResult extends BridgeResult {
  session?: KintoneScanDebugSessionState;
}

export interface RunNextKintoneScanDebugCommandRequest {
  sessionId: string;
}

export interface RunNextKintoneScanDebugCommandResult extends BridgeResult {
  session?: KintoneScanDebugSessionState;
  command?: KintoneRestCommand;
  capture?: KintoneRestCapture;
}

export interface FinishKintoneScanDebugSessionRequest {
  sessionId: string;
}

export interface FinishKintoneScanDebugSessionResult extends BridgeResult {
  run?: ScanRun;
}

export interface CancelKintoneScanDebugSessionRequest {
  sessionId: string;
}

export interface CancelKintoneScanDebugSessionResult extends BridgeResult {
  sessionId?: string;
}

export interface GetProjectScanHistoryRequest {
  projectId: string;
}

export interface GetProjectScanHistoryResult extends BridgeResult {
  runs: ScanRun[];
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
  provider: "stub" | "windows-credential-manager" | "windows-dpapi" | "keychain";
  reason?: string;
}

export interface StoreCredentialRequest {
  ownerKind: "auth_profile" | "project_local";
  ownerId: string;
  credential: string;
  keychainRef?: string;
}

export interface StoreCredentialResult extends BridgeResult {
  keychainRef?: string;
  credentialStatus: CredentialStatus;
}

export interface ForgetCredentialRequest {
  keychainRef: string;
}

export interface ForgetCredentialResult extends BridgeResult {
  keychainRef: string;
  credentialStatus: CredentialStatus;
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
  updateProjectAppList(request: UpdateProjectAppListRequest): Promise<UpdateProjectAppListResult>;
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
  storeCredential(request: StoreCredentialRequest): Promise<StoreCredentialResult>;
  forgetCredential(request: ForgetCredentialRequest): Promise<ForgetCredentialResult>;
  validateKintoneConnection(request: ValidateKintoneConnectionRequest): Promise<ValidateKintoneConnectionResult>;
  fetchKintoneAppList(request: FetchKintoneAppListRequest): Promise<FetchKintoneAppListResult>;
  startKintoneScanRun(request: StartKintoneScanRunRequest): Promise<StartKintoneScanRunResult>;
  getKintoneScanRunProgress(request: GetKintoneScanRunProgressRequest): Promise<GetKintoneScanRunProgressResult>;
  getActiveKintoneScanRun(request: GetActiveKintoneScanRunRequest): Promise<GetActiveKintoneScanRunResult>;
  resumeKintoneScanRun(request: ResumeKintoneScanRunRequest): Promise<ResumeKintoneScanRunResult>;
  cancelKintoneScanRun(request: CancelKintoneScanRunRequest): Promise<CancelKintoneScanRunResult>;
  createKintoneScanDebugSession(request: CreateKintoneScanDebugSessionRequest): Promise<CreateKintoneScanDebugSessionResult>;
  runNextKintoneScanDebugCommand(request: RunNextKintoneScanDebugCommandRequest): Promise<RunNextKintoneScanDebugCommandResult>;
  finishKintoneScanDebugSession(request: FinishKintoneScanDebugSessionRequest): Promise<FinishKintoneScanDebugSessionResult>;
  cancelKintoneScanDebugSession(request: CancelKintoneScanDebugSessionRequest): Promise<CancelKintoneScanDebugSessionResult>;
  startFixtureScanRun(request: StartFixtureScanRunRequest): Promise<StartFixtureScanRunResult>;
  getProjectScanHistory(request: GetProjectScanHistoryRequest): Promise<GetProjectScanHistoryResult>;
}
