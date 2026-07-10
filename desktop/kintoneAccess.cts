import {
  createKintoneReadOnlyClient,
  type AppSummary,
  type KintoneAppListResult,
  type KintoneConnectionResult,
  type KintoneConnectionStatus,
  type KintonePasswordAuth,
  type ProjectAppList,
} from "../packages/core/src/index.js";
import type {
  BridgeResult,
  FetchKintoneAppListRequest,
  FetchKintoneAppListResult,
  UpdateProjectAppListResult,
  ValidateKintoneConnectionRequest,
  ValidateKintoneConnectionResult,
  WorkspaceHomeSnapshot,
} from "../src/platform/bridgeTypes";

type KintoneBridgeStatus = ValidateKintoneConnectionResult["status"];

interface WorkspaceStorageAccess {
  readWorkspaceHome(): Promise<WorkspaceHomeSnapshot>;
  updateProjectAppList(projectId: string, appSummaries: AppSummary[], selectedAppIds: string[], appListFetchedAt?: string): Promise<UpdateProjectAppListResult>;
}

interface CredentialStoreAccess {
  readCredentialForInternalUse(keychainRef: string): Promise<BridgeResult & { credential?: string }>;
}

interface KintoneReadOnlyClient {
  validateConnection(): Promise<KintoneConnectionResult>;
  fetchApps(): Promise<KintoneAppListResult>;
}

interface ResolvedProjectAccess {
  home: WorkspaceHomeSnapshot;
  domain: string;
  auth: KintonePasswordAuth;
}

interface KintoneAccessServiceOptions {
  storage: WorkspaceStorageAccess;
  credentialStore: CredentialStoreAccess;
  createClient?: (options: { domain: string; auth: KintonePasswordAuth }) => KintoneReadOnlyClient;
}

export function createKintoneAccessService({ storage, credentialStore, createClient = createKintoneReadOnlyClient }: KintoneAccessServiceOptions) {
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
  };
}

function selectedIdsForFetchedApps(apps: AppSummary[], previousAppList: ProjectAppList | undefined) {
  const availableIds = new Set(apps.map((app) => app.id));
  if (!previousAppList || previousAppList.apps.length === 0) {
    return apps.map((app) => app.id);
  }

  return (previousAppList.selectedAppIds ?? previousAppList.apps.map((app) => app.id)).filter((appId) => availableIds.has(appId));
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
