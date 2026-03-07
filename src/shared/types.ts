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
  // MongoDB specific
  uri?: string;
  authSource?: string;
  directConnection?: boolean;
  tls?: boolean;
}

export type MongoQueryMode = "find" | "aggregate" | "insertOne" | "updateOne" | "deleteOne";

export interface MongoQueryInput {
  mode: MongoQueryMode;
  database: string;
  collection: string;
  filter?: any;
  projection?: any;
  sort?: any;
  limit?: number;
  pipeline?: any[];
  document?: any;
  update?: any;
}

export type QueryResult = 
  | { type: "table"; columns: string[]; rows: any[] }
  | { type: "document"; rows: any[]; raw?: any }
  | { type: "text"; message: string; raw?: any }
  | { type: "error"; message: string; raw?: any };

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
  databaseName?: string;
  content?: string; // For SQL or JSON query tabs
  isDirty?: boolean;
}

export interface SchemaNode {
  id: string;
  name: string;
  type: "database" | "schema" | "table" | "view" | "column" | "index";
  children?: SchemaNode[];
  metadata?: Record<string, unknown>;
}
