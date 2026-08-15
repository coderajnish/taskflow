import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { initializeDatabase, openDatabase } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

const dbPath = path.resolve(backendRoot, 'data', 'taskflow.db');
const schemaPath = path.resolve(backendRoot, 'schema.sql');
const seedPath = path.resolve(backendRoot, 'seed.sql');

const db = openDatabase(dbPath);
initializeDatabase(db, schemaPath, seedPath);

const app = createApp(db);
const port = 4000;

app.listen(port, () => {
  console.log(`TaskFlow backend listening on http://localhost:${port}`);
});
