import type { PlatformBridge } from "./bridgeTypes";

const fallbackDefaultProjectsRoot = "C:\\tmp\\Kintone Site Discovery\\Projects";

declare global {
  interface Window {
    kintoneDiscoveryPlatform?: PlatformBridge;
  }
}

const browserFallbackBridge: PlatformBridge = {
  async getRuntimeInfo() {
    return {
      appName: "Kintone Site Discovery",
      appVersion: "0.1.0",
      runtime: "browser",
      runtimeVersion: navigator.userAgent,
      platform: navigator.platform,
      arch: "unknown",
      isPackaged: false,
      bridgeStatus: "fallback",
    };
  },

  async chooseLocalFolder() {
    return {
      ok: false,
      cancelled: true,
      reason: "Desktop folder selection is unavailable in the browser renderer fallback.",
    };
  },

  async openLocalFolder() {
    return {
      ok: false,
      code: "UNAVAILABLE",
      message: "Opening local folders requires the desktop runtime bridge.",
    };
  },

  async getWorkspaceHome() {
    return {
      schemaVersion: 1,
      appDataRoot: "browser-fallback",
      defaultProjectsRoot: fallbackDefaultProjectsRoot,
      projects: [],
      connectedSites: [],
      authProfiles: [],
      projectAppListsByProjectId: {},
      errors: [
        {
          scope: "app",
          code: "missing",
          message: "Workspace metadata is unavailable in browser fallback mode.",
          recoverable: true,
        },
      ],
    };
  },

  async createProject() {
    return {
      ok: false,
      message: "Creating project folders requires the desktop runtime bridge.",
      errors: [
        {
          scope: "project",
          code: "io_error",
          message: "Desktop workspace storage is unavailable in browser fallback mode.",
          recoverable: true,
        },
      ],
    };
  },

  async openProjectFromFolder() {
    return {
      ok: false,
      message: "Opening project folders requires the desktop runtime bridge.",
      errors: [
        {
          scope: "project",
          code: "io_error",
          message: "Desktop workspace storage is unavailable in browser fallback mode.",
          recoverable: true,
        },
      ],
    };
  },

  async saveConnectedSite(site) {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Connected site metadata is not persisted in browser fallback mode.",
      connectedSite: site,
    };
  },

  async saveAuthProfile(profile) {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Auth profile metadata is not persisted in browser fallback mode.",
      authProfile: profile,
    };
  },

  async updateProjectMetadata() {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Project metadata is not persisted in browser fallback mode.",
    };
  },

  async updateProjectAppList() {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Project app-list metadata is not persisted in browser fallback mode.",
    };
  },

  async removeProjectFromApp(request) {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Project metadata is not persisted in browser fallback mode.",
      projectId: request.projectId,
    };
  },

  async updateConnectedSite(site) {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Connected site metadata is not persisted in browser fallback mode.",
      connectedSite: site,
    };
  },

  async removeConnectedSite(request) {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Connected site metadata is not persisted in browser fallback mode.",
      siteId: request.siteId,
    };
  },

  async updateAuthProfile(profile) {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Auth profile metadata is not persisted in browser fallback mode.",
      authProfile: profile,
    };
  },

  async removeAuthProfile(request) {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Auth profile metadata is not persisted in browser fallback mode.",
      authProfileId: request.authProfileId,
    };
  },

  async getWindowState() {
    return {
      openProjectTabs: [],
      activeTabId: "home",
      restored: false,
      scanDraftsByProjectId: {},
    };
  },

  async saveWindowState() {
    return {
      ok: true,
      code: "FALLBACK",
      message: "Window state persistence is not available in browser fallback mode.",
    };
  },

  async getOpenProjectTabs() {
    return [];
  },

  async saveOpenProjectTabs() {
    return {
      ok: true,
      code: "FALLBACK",
      message: "Project tab persistence is not available in browser fallback mode.",
    };
  },

  async getCredentialStoreStatus() {
    return {
      available: false,
      provider: "stub",
      reason: "Credential storage requires the desktop runtime bridge.",
    };
  },

  async storeCredential() {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Credential storage requires the desktop runtime bridge.",
      credentialStatus: "no_credential",
    };
  },

  async forgetCredential(request) {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Credential storage requires the desktop runtime bridge.",
      keychainRef: request.keychainRef,
      credentialStatus: "no_credential",
    };
  },

  async validateKintoneConnection() {
    return {
      ok: false,
      code: "FALLBACK",
      status: "no_credential",
      message: "Read-only kintone access requires the desktop runtime bridge.",
    };
  },

  async fetchKintoneAppList() {
    return {
      ok: false,
      code: "FALLBACK",
      status: "no_credential",
      message: "Read-only kintone access requires the desktop runtime bridge.",
    };
  },

  async startKintoneScanRun() {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Real kintone scan runs require the desktop runtime bridge.",
    };
  },

  async getKintoneScanRunProgress() {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Scan progress requires the desktop runtime bridge.",
    };
  },

  async getActiveKintoneScanRun() {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Active scan sessions require the desktop runtime bridge.",
    };
  },

  async resumeKintoneScanRun() {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Resuming scan sessions requires the desktop runtime bridge.",
    };
  },

  async cancelKintoneScanRun() {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Cancelling scan sessions requires the desktop runtime bridge.",
    };
  },

  async createKintoneScanDebugSession() {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Step scan debug sessions require the desktop dev runtime bridge.",
    };
  },

  async runNextKintoneScanDebugCommand() {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Step scan debug sessions require the desktop dev runtime bridge.",
    };
  },

  async finishKintoneScanDebugSession() {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Step scan debug sessions require the desktop dev runtime bridge.",
    };
  },

  async cancelKintoneScanDebugSession(request) {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Step scan debug sessions require the desktop dev runtime bridge.",
      sessionId: request.sessionId,
    };
  },

  async startFixtureScanRun() {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Fixture scan runner persistence requires the desktop runtime bridge.",
    };
  },

  async getProjectScanHistory() {
    return {
      ok: false,
      code: "FALLBACK",
      message: "Scan history requires the desktop runtime bridge.",
      runs: [],
    };
  },
};

export function getPlatformBridge(): PlatformBridge {
  return {
    ...browserFallbackBridge,
    ...window.kintoneDiscoveryPlatform,
  };
}
