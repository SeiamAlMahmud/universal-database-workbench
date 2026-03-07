import Database from "better-sqlite3";
import { BaseAdapter } from "./base.adapter";
import { QueryResult, SchemaNode, DatabaseConnection } from "../shared/types";

export class SQLiteAdapter extends BaseAdapter {
  private db: Database.Database | null = null;
  private config: DatabaseConnection;

  constructor(config: DatabaseConnection) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.config.filename) {
      throw new Error("SQLite database filename is required.");
    }
    this.db = new Database(this.config.filename, { verbose: console.log });
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async executeQuery(query: string): Promise<QueryResult> {
    if (!this.db) {
      throw new Error("Database not connected.");
    }

    try {
      const stmt = this.db.prepare(query);
      if (stmt.reader) {
        const rows = stmt.all();
        const columns = rows.length > 0 ? Object.keys(rows[0] as any) : [];
        return { type: "table", columns, rows };
      } else {
        const info = stmt.run();
        return {
          type: "table",
          columns: ["changes", "lastInsertRowid"],
          rows: [{ changes: info.changes, lastInsertRowid: info.lastInsertRowid }],
        };
      }
    } catch (error: any) {
      return { type: "error", message: error.message };
    }
  }

  async getSchema(): Promise<SchemaNode[]> {
    if (!this.db) {
      throw new Error("Database not connected.");
    }

    const tables = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[];

    const schemaNodes: SchemaNode[] = [];

    for (const table of tables) {
      const columns = this.db.prepare(`PRAGMA table_info(${table.name})`).all() as any[];
      const indexes = this.db.prepare(`PRAGMA index_list(${table.name})`).all() as any[];

      const columnNodes: SchemaNode[] = columns.map((col: any) => ({
        id: `${table.name}-col-${col.name}`,
        name: col.name,
        type: "column",
        metadata: { dataType: col.type, notNull: !!col.notnull, pk: !!col.pk },
      }));

      const indexNodes: SchemaNode[] = indexes.map((idx: any) => ({
        id: `${table.name}-idx-${idx.name}`,
        name: idx.name,
        type: "index",
        metadata: { unique: !!idx.unique },
      }));

      schemaNodes.push({
        id: `table-${table.name}`,
        name: table.name,
        type: "table",
        children: [...columnNodes, ...indexNodes],
      });
    }

    return schemaNodes;
  }
}
