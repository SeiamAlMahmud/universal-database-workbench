import { QueryResult, SchemaNode } from "../shared/types";

export abstract class BaseAdapter {
  /**
   * Connect to the database
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from the database
   */
  abstract disconnect(): Promise<void>;
 
  /**
   * Execute a SQL query
   */
  abstract executeQuery(query: string): Promise<QueryResult>;

  /**
   * Get the database schema (tables, columns, etc.)
   */
  abstract getSchema(): Promise<SchemaNode[]>;
}
