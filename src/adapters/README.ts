/**
 * Adapters directory
 *
 * This directory contains database adapter implementations.
 * Each adapter implements a common interface for connecting to and querying
 * a specific database type (PostgreSQL, MySQL, SQLite, MSSQL, MongoDB, etc.).
 *
 * Structure:
 *   src/adapters/
 *     base.adapter.ts        - Abstract base adapter interface
 *     postgresql.adapter.ts  - PostgreSQL adapter (using pg)
 *     mysql.adapter.ts       - MySQL adapter (using mysql2)
 *     sqlite.adapter.ts      - SQLite adapter (using better-sqlite3)
 *     mssql.adapter.ts       - MS SQL Server adapter (using mssql)
 *     mongodb.adapter.ts     - MongoDB adapter (using mongodb)
 *     index.ts               - Adapter factory/registry
 */

export {};
