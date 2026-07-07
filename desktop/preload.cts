import { contextBridge, ipcRenderer } from "electron";
import type { PlatformBridge } from "../src/platform/bridgeTypes";

const platformBridge: PlatformBridge = {
  getRuntimeInfo: () => ipcRenderer.invoke("platform:getRuntimeInfo"),
  chooseLocalFolder: () => ipcRenderer.invoke("platform:chooseLocalFolder"),
  openLocalFolder: (request) => ipcRenderer.invoke("platform:openLocalFolder", request),
  getWindowState: () => ipcRenderer.invoke("platform:getWindowState"),
  saveWindowState: (state) => ipcRenderer.invoke("platform:saveWindowState", state),
  getOpenProjectTabs: () => ipcRenderer.invoke("platform:getOpenProjectTabs"),
  saveOpenProjectTabs: (tabs) => ipcRenderer.invoke("platform:saveOpenProjectTabs", tabs),
  getCredentialStoreStatus: () => ipcRenderer.invoke("platform:getCredentialStoreStatus"),
};

contextBridge.exposeInMainWorld("kintoneDiscoveryPlatform", platformBridge);
