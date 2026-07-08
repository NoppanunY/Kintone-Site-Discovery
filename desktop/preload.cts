import { contextBridge, ipcRenderer } from "electron";
import type { PlatformBridge } from "../src/platform/bridgeTypes";

const platformBridge: PlatformBridge = {
  getRuntimeInfo: () => ipcRenderer.invoke("platform:getRuntimeInfo"),
  chooseLocalFolder: () => ipcRenderer.invoke("platform:chooseLocalFolder"),
  openLocalFolder: (request) => ipcRenderer.invoke("platform:openLocalFolder", request),
  getWorkspaceHome: () => ipcRenderer.invoke("platform:getWorkspaceHome"),
  createProject: (request) => ipcRenderer.invoke("platform:createProject", request),
  openProjectFromFolder: () => ipcRenderer.invoke("platform:openProjectFromFolder"),
  saveConnectedSite: (site) => ipcRenderer.invoke("platform:saveConnectedSite", site),
  saveAuthProfile: (profile) => ipcRenderer.invoke("platform:saveAuthProfile", profile),
  updateProjectMetadata: (request) => ipcRenderer.invoke("platform:updateProjectMetadata", request),
  removeProjectFromApp: (request) => ipcRenderer.invoke("platform:removeProjectFromApp", request),
  updateConnectedSite: (site) => ipcRenderer.invoke("platform:updateConnectedSite", site),
  removeConnectedSite: (request) => ipcRenderer.invoke("platform:removeConnectedSite", request),
  updateAuthProfile: (profile) => ipcRenderer.invoke("platform:updateAuthProfile", profile),
  removeAuthProfile: (request) => ipcRenderer.invoke("platform:removeAuthProfile", request),
  getWindowState: () => ipcRenderer.invoke("platform:getWindowState"),
  saveWindowState: (state) => ipcRenderer.invoke("platform:saveWindowState", state),
  getOpenProjectTabs: () => ipcRenderer.invoke("platform:getOpenProjectTabs"),
  saveOpenProjectTabs: (tabs) => ipcRenderer.invoke("platform:saveOpenProjectTabs", tabs),
  getCredentialStoreStatus: () => ipcRenderer.invoke("platform:getCredentialStoreStatus"),
};

contextBridge.exposeInMainWorld("kintoneDiscoveryPlatform", platformBridge);
