import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeDatabase, openDatabase, type DB } from '../src/db.js';

export interface TestContext {
  db: DB;
  dbFile: string;
  cleanup: () => void;
}

export function setupTestDatabase(): TestContext {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskflow-test-'));
  const dbFile = path.join(tmpDir, 'test.db');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const backendRoot = path.resolve(__dirname, '..');
  const schemaPath = path.resolve(backendRoot, 'schema.sql');
  const seedPath = path.resolve(backendRoot, 'seed.sql');

  const db = openDatabase(dbFile);
  initializeDatabase(db, schemaPath, seedPath);

  return {
    db,
    dbFile,
    cleanup: () => {
      db.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  };
}
