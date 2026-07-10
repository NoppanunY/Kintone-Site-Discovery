import { contextBridge, ipcRenderer } from "electron";
import type { PlatformBridge } from "../src/platform/bridgeTypes";

const platformBridge: PlatformBridge = {
  getRuntimeInfo: () => ipcRenderer.invoke("platform:getRuntimeInfo"),
  chooseLocalFolder: (request) => ipcRenderer.invoke("platform:chooseLocalFolder", request),
  openLocalFolder: (request) => ipcRenderer.invoke("platform:openLocalFolder", request),
  getWorkspaceHome: () => ipcRenderer.invoke("platform:getWorkspaceHome"),
  createProject: (request) => ipcRenderer.invoke("platform:createProject", request),
  openProjectFromFolder: () => ipcRenderer.invoke("platform:openProjectFromFolder"),
  saveConnectedSite: (site) => ipcRenderer.invoke("platform:saveConnectedSite", site),
  saveAuthProfile: (profile) => ipcRenderer.invoke("platform:saveAuthProfile", profile),
  updateProjectMetadata: (request) => ipcRenderer.invoke("platform:updateProjectMetadata", request),
  updateProjectAppList: (request) => ipcRenderer.invoke("platform:updateProjectAppList", request),
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
  storeCredential: (request) => ipcRenderer.invoke("platform:storeCredential", request),
  forgetCredential: (request) => ipcRenderer.invoke("platform:forgetCredential", request),
  validateKintoneConnection: (request) => ipcRenderer.invoke("platform:validateKintoneConnection", request),
  fetchKintoneAppList: (request) => ipcRenderer.invoke("platform:fetchKintoneAppList", request),
};

contextBridge.exposeInMainWorld("kintoneDiscoveryPlatform", platformBridge);
