import { MongoClient } from "mongodb";
import { BaseAdapter } from "./base.adapter";
import { QueryResult, SchemaNode, DatabaseConnection, MongoQueryInput } from "../shared/types";

export class MongoAdapter extends BaseAdapter {
  private client: MongoClient | null = null;
  private config: DatabaseConnection;

  constructor(config: DatabaseConnection) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    const uri = this.config.uri || `mongodb://${this.config.host || 'localhost'}:${this.config.port || 27017}`;
    
    // Construct options from config
    const options: any = {};
    if (this.config.authSource) options.authSource = this.config.authSource;
    if (this.config.directConnection !== undefined) options.directConnection = this.config.directConnection;
    if (this.config.tls !== undefined) options.tls = this.config.tls;

    this.client = new MongoClient(uri, options);
    await this.client.connect();
    
    // Verify connection by listing databases
    await this.client.db("admin").command({ ping: 1 });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }

  async executeQuery(query: string): Promise<QueryResult> {
    if (!this.client) {
      return { type: "error", message: "Database not connected." };
    }

    try {
      // Input can be a JSON string representing MongoQueryInput
      let input: MongoQueryInput;
      try {
        input = JSON.parse(query);
      } catch (e) {
        return { type: "error", message: "Invalid MongoDB query format. Please provide a JSON object." };
      }

      if (!input.database || !input.collection || !input.mode) {
        return { type: "error", message: "Missing required fields: database, collection, and mode are mandatory." };
      }

      const db = this.client.db(input.database);
      const collection = db.collection(input.collection);

      switch (input.mode) {
        case "find": {
          const docs = await collection.find(input.filter || {}, {
            projection: input.projection,
            sort: input.sort,
            limit: input.limit || 50
          }).toArray();
          return { type: "document", rows: docs, raw: docs };
        }

        case "aggregate": {
          const aggDocs = await collection.aggregate(input.pipeline || []).toArray();
          return { type: "document", rows: aggDocs, raw: aggDocs };
        }

        case "insertOne": {
          const result = await collection.insertOne(input.document || {});
          return { type: "text", message: `Document inserted successfully. ID: ${result.insertedId}`, raw: result };
        }

        case "updateOne": {
          const result = await collection.updateOne(input.filter || {}, input.update || {});
          return { type: "text", message: `Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`, raw: result };
        }

        case "deleteOne": {
          const result = await collection.deleteOne(input.filter || {});
          return { type: "text", message: `Deleted count: ${result.deletedCount}`, raw: result };
        }

        default:
          return { type: "error", message: `Unsupported MongoDB operation mode: ${input.mode}` };
      }
    } catch (error: any) {
      return { type: "error", message: error.message };
    }
  }

  async getSchema(): Promise<SchemaNode[]> {
    if (!this.client) {
      throw new Error("Database not connected.");
    }

    try {
      const admin = this.client.db("admin");
      const listDatabasesResult = await admin.command({ listDatabases: 1 });
      const databases = listDatabasesResult.databases;

      const nodes: SchemaNode[] = [];

      for (const dbInfo of databases) {
        const dbName = dbInfo.name;
        // Skip system databases if needed, or include them
        const db = this.client.db(dbName);
        const collections = await db.listCollections().toArray();

        const children: SchemaNode[] = collections.map(col => ({
          id: `mongo-${dbName}-${col.name}`,
          name: col.name,
          type: "table", // Map collection to 'table' for UI tree consistency
          metadata: { 
            type: col.type,
            db: dbName
          }
        }));

        nodes.push({
          id: `mongo-db-${dbName}`,
          name: dbName,
          type: "database",
          children: children
        });
      }

      return nodes;
    } catch (error: any) {
      console.error("Failed to fetch MongoDB schema:", error);
      throw error;
    }
  }
}
