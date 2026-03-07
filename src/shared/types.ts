// Shared types between main, preload, and renderer processes

export type DatabaseType = "postgresql" | "mysql" | "sqlite" | "mssql" | "mongodb";

export interface DatabaseConnection {
  id: string;
  name: string;
  type: DatabaseType;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  filename?: string; // for SQLite
  ssl?: boolean;
}

export type QueryResult = 
  | { type: "table"; columns: string[]; rows: any[] }
  | { type: "error"; message: string };

export interface ColumnDef {
  name: string;
  type: string;
  nullable?: boolean;
}

export interface Tab {
  id: string;
  title: string;
  type: "welcome" | "query" | "table-viewer";
  connectionId?: string;
  tableName?: string;
  content?: string; // For SQL query tabs
  isDirty?: boolean;
}

export interface SchemaNode {
  id: string;
  name: string;
  type: "database" | "schema" | "table" | "view" | "column" | "index";
  children?: SchemaNode[];
  metadata?: Record<string, unknown>;
}
