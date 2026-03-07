import { contextBridge, ipcRenderer } from "electron";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // App
  getAppVersion: () => ipcRenderer.invoke("app:get-version"),

  // Database connections
  connectDatabase: (config: unknown) =>
    ipcRenderer.invoke("db:connect", config),
  disconnectDatabase: (connectionId: string) =>
    ipcRenderer.invoke("db:disconnect", connectionId),
  executeQuery: (connectionId: string, query: string) =>
    ipcRenderer.invoke("db:execute-query", connectionId, query),

  // File system
  openFile: () => ipcRenderer.invoke("dialog:open-file"),
  saveFile: (content: string) => ipcRenderer.invoke("dialog:save-file", content),

  // Events
  onConnectionStatus: (
    callback: (status: { id: string; connected: boolean }) => void
  ) => {
    ipcRenderer.on("connection:status", (_event, status) => callback(status));
    return () => ipcRenderer.removeAllListeners("connection:status");
  },
});
