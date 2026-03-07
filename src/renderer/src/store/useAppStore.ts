import { create } from "zustand";
import { DatabaseConnection, Tab, QueryResult } from "@shared/types";

interface AppState {
  // Connections
  connections: DatabaseConnection[];
  activeConnectionId: string | null;

  // Tabs
  tabs: Tab[];
  activeTabId: string | null;

  // UI
  sidebarWidth: number;
  isSidebarCollapsed: boolean;

  // Actions
  addConnection: (connection: DatabaseConnection) => void;
  removeConnection: (id: string) => void;
  setActiveConnection: (id: string | null) => void;

  addTab: (tab: Tab) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  updateTabTitle: (id: string, title: string) => void;

  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;

  // Results
  queryResults: Record<string, QueryResult>;
  setQueryResult: (tabId: string, result: QueryResult) => void;
}

let tabCounter = 1;

export const useAppStore = create<AppState>((set) => ({
  connections: [],
  activeConnectionId: null,
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
  queryResults: {},

  addConnection: (connection) =>
    set((state) => ({ connections: [...state.connections, connection] })),

  removeConnection: (id) =>
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
      activeConnectionId:
        state.activeConnectionId === id ? null : state.activeConnectionId,
    })),

  setActiveConnection: (id) => set({ activeConnectionId: id }),

  addTab: (tab) =>
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    })),

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
}));

export const createNewQueryTab = (connectionId?: string): Tab => ({
  id: `query-${Date.now()}-${tabCounter++}`,
  title: `Query ${tabCounter - 1}`,
  type: "query",
  connectionId,
  content: "-- Write your SQL query here\nSELECT 1;",
  isDirty: false,
});
