import { Pool, PoolConfig } from "pg";
import { BaseAdapter } from "./base.adapter";
import { DatabaseConnection, PostgresQueryInput, QueryResult, SchemaNode } from "../shared/types";

type SchemaNodeMap = Record<string, SchemaNode>;

export class PostgreSQLAdapter extends BaseAdapter {
  readonly kind = "postgresql";
  private pool: Pool | null = null;
  private config: DatabaseConnection;

  constructor(config: DatabaseConnection) {
    super();
    this.config = config;
  }

  private getConnectionOptions(config: DatabaseConnection): PoolConfig {
    const uri = config.uri?.trim();
    if (uri) {
      if (!/^postgres(?:ql)?:\/\//i.test(uri)) {
        throw new Error("PostgreSQL URI must start with postgres:// or postgresql://");
      }

      let sslFromUri: PoolConfig["ssl"];
      try {
        const parsed = new URL(uri);
        const sslMode = (parsed.searchParams.get("sslmode") || "").toLowerCase();
        if (config.ssl || ["require", "verify-ca", "verify-full"].includes(sslMode)) {
          sslFromUri = { rejectUnauthorized: false };
        }
      } catch {
        throw new Error("Invalid PostgreSQL connection URI format.");
      }

      return {
        connectionString: uri,
        ssl: sslFromUri,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };
    }

    const host = config.host?.trim();
    const database = config.database?.trim();
    const user = config.user?.trim() || config.username?.trim();

    if (!host) throw new Error("PostgreSQL host is required.");
    if (!database) throw new Error("PostgreSQL database name is required.");
    if (!user) throw new Error("PostgreSQL user is required.");

    const port = Number(config.port ?? 5432);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      throw new Error("PostgreSQL port must be between 1 and 65535.");
    }

    return {
      host,
      port,
      database,
      user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
  }

  async testConnection(configOverride?: DatabaseConnection): Promise<boolean> {
    const tempPool = new Pool(this.getConnectionOptions(configOverride ?? this.config));
    try {
      await tempPool.query("SELECT 1");
      return true;
    } finally {
      await tempPool.end();
    }
  }

  async connect(): Promise<void> {
    if (this.pool) return;
    this.pool = new Pool(this.getConnectionOptions(this.config));
    await this.pool.query("SELECT current_database(), current_schema()");
  }

  async disconnect(): Promise<void> {
    if (!this.pool) return;
    await this.pool.end();
    this.pool = null;
  }

  private ensurePool(): Pool {
    if (!this.pool) {
      throw new Error("Database not connected.");
    }
    return this.pool;
  }

  private parseSqlInput(query: string): { sql: string; params: unknown[] } {
    if (!query?.trim()) {
      throw new Error("SQL query cannot be empty.");
    }

    try {
      const payload = JSON.parse(query) as PostgresQueryInput;
      if (payload?.mode === "sql" && typeof payload.sql === "string") {
        return {
          sql: payload.sql,
          params: Array.isArray(payload.params) ? payload.params : [],
        };
      }
    } catch {
      // Treat as raw SQL text.
    }

    return { sql: query, params: [] };
  }

  private toSerializableValue(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value === "bigint") return value.toString();
    if (value instanceof Date) return value.toISOString();
    if (Buffer.isBuffer(value)) return value.toString("base64");
    if (Array.isArray(value)) return value.map((item) => this.toSerializableValue(item));
    if (typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = this.toSerializableValue(v);
      }
      return out;
    }
    return value;
  }

  private sanitizeRows(rows: unknown[]): Record<string, unknown>[] {
    return rows.map((row) => this.toSerializableValue(row) as Record<string, unknown>);
  }

  private formatPgError(error: any): { name?: string; message: string; code?: string; detail?: string } {
    return {
      name: error?.name,
      message: error?.message || "Unknown PostgreSQL error",
      code: error?.code,
      detail: error?.detail,
    };
  }

  async executeQuery(query: string): Promise<QueryResult> {
    try {
      const { sql, params } = this.parseSqlInput(query);
      const result = await this.ensurePool().query(sql, params);
      const rows = this.sanitizeRows(result.rows ?? []);
      const rawSummary = {
        command: result.command,
        rowCount: result.rowCount ?? rows.length,
        fields: result.fields.map((f: { name: string; dataTypeID?: number }) => ({
          name: f.name,
          dataTypeID: f.dataTypeID,
        })),
      };

      if (rows.length > 0) {
        return {
          type: "table",
          columns: result.fields.map((f: { name: string }) => f.name),
          rows,
          rowCount: result.rowCount ?? rows.length,
          raw: rawSummary,
        };
      }

      const command = (result.command || "").toUpperCase();
      if (["INSERT", "UPDATE", "DELETE", "MERGE"].includes(command)) {
        const count = result.rowCount ?? 0;
        return {
          type: "text",
          content: `${command} executed successfully. ${count} row(s) affected.`,
          raw: rawSummary,
        };
      }

      if (command === "SELECT") {
        return {
          type: "table",
          columns: result.fields.map((f: { name: string }) => f.name),
          rows: [],
          rowCount: 0,
          raw: rawSummary,
        };
      }

      return {
        type: "text",
        content: `${command || "Statement"} executed successfully.`,
        raw: rawSummary,
      };
    } catch (error: any) {
      return { type: "error", message: error?.message || "PostgreSQL query failed.", raw: this.formatPgError(error) };
    }
  }

  async getSchema(): Promise<SchemaNode[]> {
    const pool = this.ensurePool();

    const schemaRows = await pool.query<{ schema_name: string }>(
      `SELECT schema_name
       FROM information_schema.schemata
       WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
       ORDER BY schema_name`
    );

    const tableRows = await pool.query<{ table_schema: string; table_name: string }>(
      `SELECT table_schema, table_name
       FROM information_schema.tables
       WHERE table_type = 'BASE TABLE'
         AND table_schema NOT IN ('pg_catalog', 'information_schema')
       ORDER BY table_schema, table_name`
    );

    const viewRows = await pool.query<{ table_schema: string; table_name: string }>(
      `SELECT table_schema, table_name
       FROM information_schema.views
       WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
       ORDER BY table_schema, table_name`
    );

    const functionRows = await pool.query<{ schema_name: string; function_name: string }>(
      `SELECT n.nspname AS schema_name, p.proname AS function_name
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
       ORDER BY n.nspname, p.proname`
    );

    const columnRows = await pool.query<{
      table_schema: string;
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: "YES" | "NO";
      ordinal_position: number;
    }>(
      `SELECT table_schema, table_name, column_name, data_type, is_nullable, ordinal_position
       FROM information_schema.columns
       WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
       ORDER BY table_schema, table_name, ordinal_position`
    );

    const indexRows = await pool.query<{
      schemaname: string;
      tablename: string;
      indexname: string;
      indexdef: string;
    }>(
      `SELECT schemaname, tablename, indexname, indexdef
       FROM pg_indexes
       WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
       ORDER BY schemaname, tablename, indexname`
    );

    const schemaNodes: SchemaNode[] = [];
    const map: SchemaNodeMap = {};

    for (const row of schemaRows.rows) {
      const schemaId = `pg-schema-${row.schema_name}`;
      const tablesId = `${schemaId}-tables`;
      const viewsId = `${schemaId}-views`;
      const functionsId = `${schemaId}-functions`;

      const schemaNode: SchemaNode = {
        id: schemaId,
        name: row.schema_name,
        type: "schema",
        children: [
          { id: tablesId, name: "tables", type: "schema", children: [], metadata: { group: "tables", schema: row.schema_name } },
          { id: viewsId, name: "views", type: "schema", children: [], metadata: { group: "views", schema: row.schema_name } },
          { id: functionsId, name: "functions", type: "schema", children: [], metadata: { group: "functions", schema: row.schema_name } },
        ],
        metadata: { schema: row.schema_name },
      };

      map[schemaId] = schemaNode;
      map[tablesId] = schemaNode.children![0];
      map[viewsId] = schemaNode.children![1];
      map[functionsId] = schemaNode.children![2];
      schemaNodes.push(schemaNode);
    }

    for (const row of tableRows.rows) {
      const parentId = `pg-schema-${row.table_schema}-tables`;
      const tableNode: SchemaNode = {
        id: `pg-table-${row.table_schema}-${row.table_name}`,
        name: row.table_name,
        type: "table",
        children: [],
        metadata: { schema: row.table_schema },
      };
      map[parentId]?.children?.push(tableNode);
      map[tableNode.id] = tableNode;
    }

    for (const row of viewRows.rows) {
      const parentId = `pg-schema-${row.table_schema}-views`;
      const viewNode: SchemaNode = {
        id: `pg-view-${row.table_schema}-${row.table_name}`,
        name: row.table_name,
        type: "view",
        children: [],
        metadata: { schema: row.table_schema },
      };
      map[parentId]?.children?.push(viewNode);
      map[viewNode.id] = viewNode;
    }

    for (const row of functionRows.rows) {
      const parentId = `pg-schema-${row.schema_name}-functions`;
      const fnNode: SchemaNode = {
        id: `pg-function-${row.schema_name}-${row.function_name}`,
        name: row.function_name,
        type: "view",
        metadata: { schema: row.schema_name, objectType: "function" },
      };
      map[parentId]?.children?.push(fnNode);
    }

    for (const row of columnRows.rows) {
      const tableId = `pg-table-${row.table_schema}-${row.table_name}`;
      const viewId = `pg-view-${row.table_schema}-${row.table_name}`;
      const target = map[tableId] || map[viewId];
      if (!target) continue;
      if (!target.children) target.children = [];
      target.children.push({
        id: `${target.id}-col-${row.column_name}`,
        name: row.column_name,
        type: "column",
        metadata: {
          dataType: row.data_type,
          nullable: row.is_nullable === "YES",
          ordinal: row.ordinal_position,
        },
      });
    }

    for (const row of indexRows.rows) {
      const tableId = `pg-table-${row.schemaname}-${row.tablename}`;
      const target = map[tableId];
      if (!target) continue;
      if (!target.children) target.children = [];
      target.children.push({
        id: `${tableId}-idx-${row.indexname}`,
        name: row.indexname,
        type: "index",
        metadata: { definition: row.indexdef },
      });
    }

    return schemaNodes;
  }

  async listRoots(): Promise<SchemaNode[]> {
    return this.getSchema();
  }

  async listChildren(nodeId: string): Promise<SchemaNode[]> {
    const schema = await this.getSchema();
    const stack = [...schema];
    while (stack.length) {
      const node = stack.pop()!;
      if (node.id === nodeId) return node.children ?? [];
      if (node.children?.length) {
        stack.push(...node.children);
      }
    }
    return [];
  }
}
