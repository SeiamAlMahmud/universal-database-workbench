import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs";
import { SQLiteAdapter } from "../adapters/sqlite.adapter";
import { DatabaseConnection, QueryResult, SchemaNode } from "../shared/types";
import { BaseAdapter } from "../adapters/base.adapter";

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
if (require("electron-squirrel-startup")) {
  app.quit();
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

const connections = new Map<string, BaseAdapter>();

const createWindow = () => {
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
      sandbox: true,
    },
    title: "DB Workbench",
    show: false,
  });

  // Load the renderer.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
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
  try {
    let adapter: BaseAdapter;
    if (config.type === "sqlite") {
      adapter = new SQLiteAdapter(config);
    } else {
      throw new Error(`Unsupported database type: ${config.type}`);
    }

    await adapter.connect();
    connections.set(config.id, adapter);
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

ipcMain.handle("db:get-schema", async (event, id: string): Promise<SchemaNode[]> => {
  const adapter = connections.get(id);
  if (!adapter) {
    throw new Error("Database not connected.");
  }
  return await adapter.getSchema();
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
