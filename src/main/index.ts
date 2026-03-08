import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from "electron";
import path from "path";
import fs from "fs";
import { DatabaseConnection, QueryResult, SchemaNode } from "../shared/types";
import { BaseAdapter } from "../adapters/base.adapter";
import { createAdapter, adapterSupportsConnectionTest, adapterSupportsTree } from "../adapters";

const CONNECTIONS_FILE = path.join(app.getPath("userData"), "connections.json");

function getSavedConnections(): DatabaseConnection[] {
  if (!fs.existsSync(CONNECTIONS_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(CONNECTIONS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to load connections:", e);
    return [];
  }
}

function saveSavedConnections(connections: DatabaseConnection[]) {
  try {
    // Ensure the userData directory exists
    const dir = path.dirname(CONNECTIONS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(connections, null, 2));
  } catch (e) {
    console.error("Failed to save connections:", e);
  }
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try {
  if (require("electron-squirrel-startup")) {
    app.quit();
  }
} catch (e) {
  // electron-squirrel-startup not available (e.g. MSI install) — continue normally
}

// Show error dialogs for unhandled crashes so the app doesn't silently die
process.on("uncaughtException", (error) => {
  dialog.showErrorBox(
    "A JavaScript error occurred in the main process",
    `${error.name}: ${error.message}\n\nStack:\n${error.stack}`
  );
  app.quit();
});

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

const connections = new Map<string, BaseAdapter>();

const createWindow = () => {
  Menu.setApplicationMenu(null);

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0f1117",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // must be false for preload to access Electron APIs with native modules
    },
    title: "murgiDB",
    show: false,
  });

  // Load the renderer.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    // __dirname => .vite/build/main, so renderer bundle is in ../../renderer/<windowName>/...
    mainWindow.loadFile(
      path.join(__dirname, `../../renderer/${MAIN_WINDOW_VITE_NAME}/src/renderer/index.html`)
    );
  }

  // Show window once ready to avoid flash of white
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
};

// Database IPC Handlers
ipcMain.handle("db:connect", async (event, config: DatabaseConnection) => {
  console.log(`[Main] Connecting to database: ${config.type} (${config.name})`);
  try {
    const adapter = createAdapter(config);

    await adapter.connect();
    connections.set(config.id, adapter);
    console.log(`[Main] Connected successfully: ${config.id}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Main] Connection error:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("db:testConnection", async (event, config: DatabaseConnection) => {
  try {
    const adapter = createAdapter(config);
    if (adapterSupportsConnectionTest(adapter)) {
      const ok = await adapter.testConnection(config);
      return { success: ok };
    }

    await adapter.connect();
    await adapter.disconnect();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("db:disconnect", async (event, id: string) => {
  const adapter = connections.get(id);
  if (adapter) {
    await adapter.disconnect();
    connections.delete(id);
  }
});

ipcMain.handle("db:execute-query", async (event, id: string, query: string): Promise<QueryResult> => {
  const adapter = connections.get(id);
  if (!adapter) {
    return { type: "error", message: "Database not connected." };
  }
  return await adapter.executeQuery(query);
});

ipcMain.handle("db:execute", async (event, id: string, query: unknown): Promise<QueryResult> => {
  const adapter = connections.get(id);
  if (!adapter) {
    return { type: "error", message: "Database not connected." };
  }
  const payload = typeof query === "string" ? query : JSON.stringify(query);
  return await adapter.executeQuery(payload);
});

ipcMain.handle("db:get-schema", async (event, id: string): Promise<SchemaNode[]> => {
  const adapter = connections.get(id);
  if (!adapter) {
    throw new Error("Database not connected.");
  }
  return await adapter.getSchema();
});

ipcMain.handle("db:listRoots", async (event, id: string): Promise<SchemaNode[]> => {
  const adapter = connections.get(id);
  if (!adapter) {
    throw new Error("Database not connected.");
  }

  if (adapterSupportsTree(adapter)) {
    return adapter.listRoots();
  }

  return adapter.getSchema();
});

ipcMain.handle("db:listChildren", async (event, id: string, nodeId: string): Promise<SchemaNode[]> => {
  const adapter = connections.get(id);
  if (!adapter) {
    throw new Error("Database not connected.");
  }

  if (adapterSupportsTree(adapter)) {
    return adapter.listChildren(nodeId);
  }

  const roots = await adapter.getSchema();
  const stack = [...roots];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.id === nodeId) return node.children ?? [];
    if (node.children?.length) {
      stack.push(...node.children);
    }
  }
  return [];
});

ipcMain.handle("dialog:open-file", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "SQLite Database", extensions: ["db", "sqlite", "sqlite3"] }],
  });

  if (result.canceled) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle("db:get-saved-connections", async () => {
  return getSavedConnections();
});

ipcMain.handle("db:save-saved-connections", async (event, connections: DatabaseConnection[]) => {
  saveSavedConnections(connections);
  return { success: true };
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on("ready", createWindow);

// IPC handler for opening URLs in the default browser
ipcMain.handle("shell:open-external", async (_event, url: string) => {
  await shell.openExternal(url);
});

// Quit when all windows are closed, except on macOS.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
