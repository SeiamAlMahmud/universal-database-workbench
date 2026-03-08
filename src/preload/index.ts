import { contextBridge, ipcRenderer } from "electron";
import { QueryResult, SchemaNode } from "../shared/types";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // App
  getAppVersion: () => ipcRenderer.invoke("app:get-version"),
  openExternal: (url: string) => ipcRenderer.invoke("shell:open-external", url),

  // Database connections
  testConnection: (config: unknown) =>
    ipcRenderer.invoke("db:testConnection", config),
  connectDatabase: (config: unknown) =>
    ipcRenderer.invoke("db:connect", config),
  disconnectDatabase: (connectionId: string) =>
    ipcRenderer.invoke("db:disconnect", connectionId),
  executeQuery: (connectionId: string, query: string): Promise<QueryResult> =>
    ipcRenderer.invoke("db:execute-query", connectionId, query),
  execute: (connectionId: string, query: unknown): Promise<QueryResult> =>
    ipcRenderer.invoke("db:execute", connectionId, query),

  getSchema: (connectionId: string): Promise<SchemaNode[]> =>
    ipcRenderer.invoke("db:get-schema", connectionId),
  listRoots: (connectionId: string): Promise<SchemaNode[]> =>
    ipcRenderer.invoke("db:listRoots", connectionId),
  listChildren: (connectionId: string, nodeId: string): Promise<SchemaNode[]> =>
    ipcRenderer.invoke("db:listChildren", connectionId, nodeId),

  // File system
  openFile: () => ipcRenderer.invoke("dialog:open-file"),
  getSavedConnections: () => ipcRenderer.invoke("db:get-saved-connections"),
  saveSavedConnections: (connections: any[]) => ipcRenderer.invoke("db:save-saved-connections", connections),
  saveFile: (content: string) => ipcRenderer.invoke("dialog:save-file", content),

  // Events
  onConnectionStatus: (
    callback: (status: { id: string; connected: boolean }) => void
  ) => {
    ipcRenderer.on("connection:status", (_event, status) => callback(status));
    return () => ipcRenderer.removeAllListeners("connection:status");
  },
});
