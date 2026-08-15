import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export type DB = Database.Database;

export function openDatabase(dbPath: string): DB {
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  return db;
}

export function initializeDatabase(db: DB, schemaPath: string, seedPath: string): void {
  const hasBoardsTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='boards'")
    .get() as { name: string } | undefined;

  if (hasBoardsTable) {
    return;
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  const seedSql = fs.readFileSync(seedPath, 'utf-8');

  db.exec(schemaSql);
  db.exec(seedSql);
}
