import type { BaseAdapter } from "./base.adapter";
import { DatabaseConnection, SchemaNode } from "../shared/types";

type AdapterFactory = (config: DatabaseConnection) => BaseAdapter;

const loadAdapterClass = <T>(loader: () => T, dependencyName: string): T => {
  try {
    return loader();
  } catch (error: any) {
    const message = String(error?.message || "");
    if (error?.code === "MODULE_NOT_FOUND" && message.includes(`'${dependencyName}'`)) {
      throw new Error(
        `Missing runtime dependency "${dependencyName}". Reinstall the app package or run "pnpm install" before packaging.`
      );
    }
    throw error;
  }
};

const ADAPTER_REGISTRY: Record<string, AdapterFactory> = {
  sqlite: (config) => {
    const { SQLiteAdapter } = loadAdapterClass(
      () => require("./sqlite.adapter"),
      "better-sqlite3"
    );
    return new SQLiteAdapter(config);
  },
  mongodb: (config) => {
    const { MongoAdapter } = loadAdapterClass(() => require("./mongodb.adapter"), "mongodb");
    return new MongoAdapter(config);
  },
  postgresql: (config) => {
    const { PostgreSQLAdapter } = loadAdapterClass(() => require("./postgresql.adapter"), "pg");
    return new PostgreSQLAdapter(config);
  },
};

export const createAdapter = (config: DatabaseConnection): BaseAdapter => {
  const type = config.type?.toLowerCase().trim();
  const factory = ADAPTER_REGISTRY[type];
  if (!factory) {
    throw new Error(`Unsupported database type: ${config.type}`);
  }
  return factory(config);
};

export const adapterSupportsTree = (
  adapter: BaseAdapter
): adapter is BaseAdapter & {
  testConnection: (config?: DatabaseConnection) => Promise<boolean>;
  listRoots: () => Promise<SchemaNode[]>;
  listChildren: (nodeId: string) => Promise<SchemaNode[]>;
} => {
  const candidate = adapter as any;
  return (
    typeof candidate?.listRoots === "function" &&
    typeof candidate?.listChildren === "function"
  );
};

export const adapterSupportsConnectionTest = (
  adapter: BaseAdapter
): adapter is BaseAdapter & { testConnection: (config?: DatabaseConnection) => Promise<boolean> } => {
  return typeof (adapter as any)?.testConnection === "function";
};
