import { BaseAdapter } from "./base.adapter";
import { MongoAdapter } from "./mongodb.adapter";
import { PostgreSQLAdapter } from "./postgresql.adapter";
import { SQLiteAdapter } from "./sqlite.adapter";
import { DatabaseConnection, SchemaNode } from "../shared/types";

type AdapterFactory = (config: DatabaseConnection) => BaseAdapter;

const ADAPTER_REGISTRY: Record<string, AdapterFactory> = {
  sqlite: (config) => new SQLiteAdapter(config),
  mongodb: (config) => new MongoAdapter(config),
  postgresql: (config) => new PostgreSQLAdapter(config),
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
