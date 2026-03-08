import { DatabaseType } from "@shared/types";

export type DatabaseCategory = "sql" | "document";

interface DatabaseCapability {
  label: string;
  category: DatabaseCategory;
  enabled: boolean;
  icon: string;
}

export const DATABASE_CAPABILITIES: Record<DatabaseType, DatabaseCapability> = {
  sqlite: { label: "SQLite", category: "sql", enabled: true, icon: "📁" },
  postgresql: { label: "PostgreSQL", category: "sql", enabled: false, icon: "🐘" },
  mysql: { label: "MySQL", category: "sql", enabled: false, icon: "🐬" },
  mssql: { label: "MSSQL", category: "sql", enabled: false, icon: "🪟" },
  mongodb: { label: "MongoDB", category: "document", enabled: true, icon: "🍃" },
};

export const getDatabaseCategory = (type?: DatabaseType): DatabaseCategory => {
  if (!type) return "sql";
  return DATABASE_CAPABILITIES[type]?.category ?? "sql";
};

export const isDocumentDatabase = (type?: DatabaseType): boolean => {
  return getDatabaseCategory(type) === "document";
};
