import { DatabaseConnection, QueryResult, SchemaNode } from "../../../shared/types";

interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  testConnection: (config: DatabaseConnection) => Promise<{ success: boolean; error?: string }>;
  connectDatabase: (config: DatabaseConnection) => Promise<{ success: boolean; id?: string; error?: string }>;
  disconnectDatabase: (connectionId: string) => Promise<void>;
  executeQuery: (connectionId: string, query: string) => Promise<QueryResult>;
  execute: (connectionId: string, query: unknown) => Promise<QueryResult>;
  getSchema: (connectionId: string) => Promise<SchemaNode[]>;
  listRoots: (connectionId: string) => Promise<SchemaNode[]>;
  listChildren: (connectionId: string, nodeId: string) => Promise<SchemaNode[]>;
  openFile: () => Promise<string | null>;
  getSavedConnections: () => Promise<DatabaseConnection[]>;
  saveSavedConnections: (connections: DatabaseConnection[]) => Promise<{ success: boolean; error?: string }>;
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
