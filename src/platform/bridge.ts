import type { PlatformBridge } from "./bridgeTypes";

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

  async getWindowState() {
    return {
      openProjectTabs: [],
      activeTabId: "home",
      restored: false,
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
      reason: "Credential storage is not implemented in this scaffold.",
    };
  },
};

export function getPlatformBridge(): PlatformBridge {
  return window.kintoneDiscoveryPlatform ?? browserFallbackBridge;
}
