import { create } from "zustand";
import { DatabaseConnection, Tab, QueryResult, SchemaNode } from "@shared/types";

export type AppTheme = "light" | "dark" | "system";

interface AppState {
  // Connections
  connections: DatabaseConnection[];
  activeConnectionId: string | null;
  schemas: Record<string, SchemaNode[]>; // connectionId -> schema

  // Saved Connections
  savedConnections: DatabaseConnection[];
  loadSavedConnections: () => Promise<void>;
  saveConnectionProfile: (profile: DatabaseConnection) => Promise<void>;
  deleteConnectionProfile: (id: string) => Promise<void>;

  // Tabs
  tabs: Tab[];
  activeTabId: string | null;

  // UI
  sidebarWidth: number;
  isSidebarCollapsed: boolean;
  theme: AppTheme;

  // Actions
  setTheme: (theme: AppTheme) => void;
  addConnection: (connection: DatabaseConnection) => Promise<{ success: boolean; error?: string }>;
  removeConnection: (id: string) => void;
  setActiveConnection: (id: string | null) => void;
  getSchema: (id: string) => Promise<void>;

  addTab: (tab: Tab) => void;
  openTableTab: (connectionId: string, tableName: string, databaseName?: string) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  updateTabTitle: (id: string, title: string) => void;

  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;

  // Results
  queryResults: Record<string, QueryResult>;
  setQueryResult: (tabId: string, result: QueryResult) => void;

  // Connection Manager UI
  isConnectionManagerOpen: boolean;
  connectionManagerMode: "list" | "form";
  connectionManagerId: string | undefined;
  openConnectionManager: (id?: string, mode?: "list" | "form") => void;
  closeConnectionManager: () => void;
}

let tabCounter = 1;

export const useAppStore = create<AppState>((set, get) => ({
  connections: [],
  activeConnectionId: null,
  schemas: {},
  savedConnections: [],
  tabs: [
    {
      id: "welcome",
      title: "Welcome",
      type: "welcome",
    },
  ],
  activeTabId: "welcome",
  sidebarWidth: 260,
  isSidebarCollapsed: false,
  theme: "system",
  queryResults: {},
  isConnectionManagerOpen: false,
  connectionManagerMode: "list",
  connectionManagerId: undefined,

  loadSavedConnections: async () => {
    const saved = await window.electronAPI.getSavedConnections();
    set({ savedConnections: saved });
  },

  openConnectionManager: (id, mode = "list") => {
    set({
      isConnectionManagerOpen: true,
      connectionManagerId: id,
      connectionManagerMode: mode,
    });
  },

  closeConnectionManager: () => {
    set({
      isConnectionManagerOpen: false,
      connectionManagerId: undefined,
      connectionManagerMode: "list",
    });
  },

  saveConnectionProfile: async (profile) => {
    const { savedConnections } = get();
    const existingIndex = savedConnections.findIndex((c) => c.id === profile.id);
    let newSaved;
    if (existingIndex >= 0) {
      newSaved = [...savedConnections];
      newSaved[existingIndex] = profile;
    } else {
      newSaved = [...savedConnections, profile];
    }
    set({ savedConnections: newSaved });
    await window.electronAPI.saveSavedConnections(newSaved);
  },

  deleteConnectionProfile: async (id) => {
    const newSaved = get().savedConnections.filter((c) => c.id !== id);
    set({ savedConnections: newSaved });
    await window.electronAPI.saveSavedConnections(newSaved);
  },

  addConnection: async (connection) => {
    const result = await window.electronAPI.connectDatabase(connection);
    if (result.success) {
      set((state) => ({ connections: [...state.connections, connection] }));
      await get().getSchema(connection.id);
    }
    return result;
  },

  removeConnection: (id) => {
    window.electronAPI.disconnectDatabase(id);
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
      activeConnectionId:
        state.activeConnectionId === id ? null : state.activeConnectionId,
      schemas: { ...state.schemas, [id]: undefined as any },
    }));
  },

  setActiveConnection: (id) => set({ activeConnectionId: id }),

  getSchema: async (id) => {
    try {
      const nodes = await window.electronAPI.getSchema(id);
      set((state) => ({
        schemas: { ...state.schemas, [id]: nodes },
      }));
    } catch (error) {
      console.error("Failed to fetch schema:", error);
    }
  },

  addTab: (tab) =>
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    })),

  openTableTab: (connectionId: string, tableName: string, databaseName?: string) => {
    const { tabs, setActiveTab, addTab } = get();
    const existingTab = tabs.find(
      (t) =>
        t.type === "table-viewer" &&
        t.connectionId === connectionId &&
        t.tableName === tableName &&
        t.databaseName === databaseName
    );
    
    if (existingTab) {
      setActiveTab(existingTab.id);
    } else {
      addTab({
        id: `table-${connectionId}-${databaseName ? databaseName + '-' : ''}${tableName}-${Date.now()}`,
        title: databaseName ? `${databaseName}.${tableName}` : tableName,
        type: "table-viewer",
        connectionId,
        tableName,
        databaseName,
      });
    }
  },

  removeTab: (id) =>
    set((state) => {
      const tabs = state.tabs.filter((t) => t.id !== id);
      const activeTabId =
        state.activeTabId === id
          ? tabs[tabs.length - 1]?.id ?? null
          : state.activeTabId;
      return { tabs, activeTabId };
    }),

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTabContent: (id, content) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, content, isDirty: true } : t
      ),
    })),

  updateTabTitle: (id, title) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, title } : t)),
    })),

  setSidebarWidth: (width) => set({ sidebarWidth: width }),

  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  setQueryResult: (tabId, result) =>
    set((state) => ({
      queryResults: { ...state.queryResults, [tabId]: result },
    })),

  setTheme: (theme) => set({ theme }),
}));

export const createNewQueryTab = (connectionId?: string, connectionType?: string): Tab => {
  let content = "-- Write your SQL query here\nSELECT 1;";
  if (connectionType === 'mongodb') {
    content = JSON.stringify({
      mode: "find",
      database: "test",
      collection: "users",
      filter: {},
      limit: 50
    }, null, 2);
  }

  return {
    id: `query-${Date.now()}-${tabCounter++}`,
    title: `Query ${tabCounter - 1}`,
    type: "query",
    connectionId,
    content,
    isDirty: false,
  };
};
