# TaskFlow

TaskFlow is a lightweight Trello-style take-home project built as a monorepo with:
- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + TypeScript + Express
- **Database:** SQLite via **better-sqlite3** using raw SQL (no ORM)
- **Tests:** Vitest + Supertest (backend)

## Repository structure

```text
/taskflow
  /backend
  /frontend
  package.json
  README.md
```

## Setup (clean clone)

From the `taskflow` directory:

```bash
npm install
```

### Run in development

```bash
npm run dev
```

This runs:
- Backend: `http://localhost:4000`
- Frontend: `http://localhost:5173`

### Run tests

```bash
npm run test
```

## Backend API

- `GET /api/boards/:boardId?priority=All|Low|Medium|High`
- `POST /api/tasks`
- `PATCH /api/tasks/:taskId`
- `PATCH /api/tasks/:taskId/move`
- `DELETE /api/tasks/:taskId`
- `GET /api/boards/:boardId/stats/tasks-per-column`
- `GET /api/health`

## Database

Database file path:
- `backend/data/taskflow.db`

Schema and seed files:
- `backend/schema.sql`
- `backend/seed.sql`

On first backend run, database initialization executes:
1. `schema.sql`
2. `seed.sql`

SQLite foreign keys are enabled with:
- `PRAGMA foreign_keys = ON`

## Required non-trivial SQL queries

These are defined in `backend/src/queries.ts`.

### A) Tasks per column (count) for a board

```sql
SELECT
  c.id AS column_id,
  c.name AS column_name,
  c.position AS column_position,
  COUNT(t.id) AS task_count
FROM columns c
LEFT JOIN tasks t ON t.column_id = c.id
WHERE c.board_id = ?
GROUP BY c.id, c.name, c.position
ORDER BY c.position ASC;
```

### B) Tasks by priority on a board, newest first

```sql
SELECT
  t.id,
  t.column_id,
  t.title,
  t.description,
  t.priority,
  t.created_at
FROM tasks t
INNER JOIN columns c ON c.id = t.column_id
WHERE c.board_id = ?
  AND t.priority = ?
ORDER BY datetime(t.created_at) DESC, t.id DESC;
```

## Validation and error handling

- Backend validates task title as required and trimmed.
- Empty or whitespace-only title returns `400` with JSON:

```json
{ "error": "title is required" }
```

- Frontend catches failed API requests and shows an error banner.

## Tests included

Backend tests (`backend/tests/app.test.ts`) include:
1. Creating task with empty title fails with `400`
2. Moving task updates its column correctly
3. DB-layer test for tasks-per-column SQL query using seeded data

## Decisions and assumptions

- Kept schema intentionally small and relational (`boards` → `columns` → `tasks`).
- Chose `TEXT` for timestamps (`created_at`) with `CURRENT_TIMESTAMP` default.
- Priority enforced with SQL `CHECK` constraint (`Low`, `Medium`, `High`).
- Board id `1` is used as default UI board.
- Filtering by priority is backend-driven (`priority` query parameter).

## What I would improve with more time

- Add pagination/search and optimistic UI updates.
- Add stronger request validation layer (e.g., zod).
- Add transaction boundaries around multi-step operations where needed.
- Add frontend tests (component/integration) and e2e test coverage.
- Add Docker compose for one-command local startup.

## Rough time estimate

~5-7 hours for implementation, testing, and documentation.

## One thing I learned / looked up

I reviewed `better-sqlite3` patterns for deterministic local tests using isolated temporary SQLite files and schema bootstrapping from SQL files.
