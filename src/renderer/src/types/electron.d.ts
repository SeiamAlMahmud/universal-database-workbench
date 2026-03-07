// Type declarations for the Electron API exposed via contextBridge in preload/index.ts

interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  connectDatabase: (config: unknown) => Promise<{ success: boolean; id?: string; error?: string }>;
  disconnectDatabase: (connectionId: string) => Promise<void>;
  executeQuery: (connectionId: string, query: string) => Promise<unknown>;
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
