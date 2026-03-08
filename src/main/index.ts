import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from "electron";
import path from "path";
import fs from "fs";
import { DatabaseConnection, QueryResult, SchemaNode } from "../shared/types";
import { BaseAdapter } from "../adapters/base.adapter";
import { createAdapter, adapterSupportsConnectionTest, adapterSupportsTree } from "../adapters";

// ⚠️  MUST be the very first thing that runs — before any app.* calls.
// Squirrel fires install/uninstall/update events by launching the app with
// special CLI args.  electron-squirrel-startup intercepts them, creates
// Start Menu + Desktop shortcuts, then exits.  If ANY app.* code runs first
// Squirrel's shortcut creation silently fails and the user sees no shortcut.
try {
  if (require("electron-squirrel-startup")) {
    app.quit();
  }
} catch (e) {
  // Not a Squirrel install (e.g. WiX MSI, portable, dev) — continue normally.
}

// Force all runtime data into a writable per-user location on Windows installs.
const APP_DIR_NAME = "murgiDB";
const USER_DATA_PATH = path.join(app.getPath("appData"), APP_DIR_NAME);
const SESSION_DATA_PATH = path.join(USER_DATA_PATH, "SessionData");
const DISK_CACHE_PATH = path.join(SESSION_DATA_PATH, "Cache");

try {
  fs.mkdirSync(DISK_CACHE_PATH, { recursive: true });
} catch (e) {
  console.error("Failed to create cache directories:", e);
}
app.setPath("userData", USER_DATA_PATH);
app.setPath("sessionData", SESSION_DATA_PATH);
app.commandLine.appendSwitch("disk-cache-dir", DISK_CACHE_PATH);

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

// (electron-squirrel-startup is now at the very top of this file)

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
  let startupErrorShown = false;

  const showStartupError = (title: string, message: string) => {
    if (startupErrorShown) return;
    startupErrorShown = true;
    dialog.showErrorBox(title, message);
  };

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
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL).catch((error) => {
      showStartupError(
        "Renderer Load Error",
        `Failed to load dev server URL.\n\nURL: ${MAIN_WINDOW_VITE_DEV_SERVER_URL}\n\n${String(error)}`
      );
    });
  } else {
    // Prefer Electron Forge Vite output: .vite/renderer/<windowName>/index.html
    // Keep a legacy fallback to avoid silent blank windows after packaging.
    const rendererCandidates = [
      path.join(__dirname, `../../../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      path.join(__dirname, `../../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      path.join(__dirname, `../../renderer/${MAIN_WINDOW_VITE_NAME}/src/renderer/index.html`),
    ];
    const tryLoadRenderer = async (index: number): Promise<void> => {
      if (mainWindow.isDestroyed()) return;
      const rendererEntry = rendererCandidates[index];
      try {
        await mainWindow.loadFile(rendererEntry);
      } catch (error) {
        if (mainWindow.isDestroyed()) return;
        if (index < rendererCandidates.length - 1) {
          await tryLoadRenderer(index + 1);
          return;
        }
        showStartupError(
          "Renderer File Missing",
          `Failed to load renderer file.\n\nTried paths:\n${rendererCandidates.join("\n")}\n\n${String(error)}`
        );
      }
    };
    void tryLoadRenderer(0);
  }

  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame) return;
      console.error("[Main] Renderer failed to load:", {
        errorCode,
        errorDescription,
        validatedURL,
      });
    }
  );

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    showStartupError(
      "Renderer Process Crashed",
      `Reason: ${details.reason}\nExit Code: ${details.exitCode}`
    );
  });

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
