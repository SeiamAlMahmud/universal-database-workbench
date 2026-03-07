import { DatabaseConnection, QueryResult, SchemaNode } from "../../../shared/types";

interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  connectDatabase: (config: DatabaseConnection) => Promise<{ success: boolean; id?: string; error?: string }>;
  disconnectDatabase: (connectionId: string) => Promise<void>;
  executeQuery: (connectionId: string, query: string) => Promise<QueryResult>;
  getSchema: (connectionId: string) => Promise<SchemaNode[]>;
  openFile: () => Promise<string | null>;
  saveFile: (content: string) => Promise<boolean>;
  onConnectionStatus: (
    callback: (status: { id: string; connected: boolean }) => void
  ) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
