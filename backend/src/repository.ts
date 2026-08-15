import type { DB } from './db.js';
import { TASKS_BY_PRIORITY_SQL, TASKS_PER_COLUMN_SQL } from './queries.js';
import type { Board, BoardColumn, Priority, PriorityFilter, Task } from './types.js';

const ALL_TASKS_FOR_BOARD_SQL = `
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
  ORDER BY datetime(t.created_at) DESC, t.id DESC;
`;

export interface BoardView {
  board: Board;
  columns: BoardColumn[];
  tasksByColumn: Record<string, Task[]>;
}

export interface CreateTaskInput {
  columnId: number;
  title: string;
  description?: string;
  priority?: Priority;
}

export interface UpdateTaskInput {
  title: string;
  description?: string;
  priority?: Priority;
}

export function getBoardView(db: DB, boardId: number, priority: PriorityFilter): BoardView | null {
  const board = db.prepare('SELECT id, name FROM boards WHERE id = ?').get(boardId) as Board | undefined;
  if (!board) return null;

  const columns = db
    .prepare('SELECT id, board_id, name, position FROM columns WHERE board_id = ? ORDER BY position ASC')
    .all(boardId) as BoardColumn[];

  const tasks =
    priority === 'All'
      ? (db.prepare(ALL_TASKS_FOR_BOARD_SQL).all(boardId) as Task[])
      : (db.prepare(TASKS_BY_PRIORITY_SQL).all(boardId, priority) as Task[]);

  const tasksByColumn: Record<string, Task[]> = {};
  for (const column of columns) {
    tasksByColumn[String(column.id)] = [];
  }

  for (const task of tasks) {
    const key = String(task.column_id);
    if (!tasksByColumn[key]) tasksByColumn[key] = [];
    tasksByColumn[key].push(task);
  }

  return { board, columns, tasksByColumn };
}

export function createTask(db: DB, input: CreateTaskInput): Task {
  const insert = db.prepare(
    `INSERT INTO tasks (column_id, title, description, priority)
     VALUES (?, ?, ?, ?)`
  );

  const result = insert.run(input.columnId, input.title, input.description ?? null, input.priority ?? 'Medium');

  const created = db
    .prepare('SELECT id, column_id, title, description, priority, created_at FROM tasks WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as Task | undefined;

  if (!created) {
    throw new Error('Failed to fetch created task');
  }

  return created;
}

export function updateTask(db: DB, taskId: number, input: UpdateTaskInput): Task | null {
  const existing = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId) as { id: number } | undefined;
  if (!existing) return null;

  db.prepare('UPDATE tasks SET title = ?, description = ?, priority = ? WHERE id = ?').run(
    input.title,
    input.description ?? null,
    input.priority ?? 'Medium',
    taskId
  );

  return db
    .prepare('SELECT id, column_id, title, description, priority, created_at FROM tasks WHERE id = ?')
    .get(taskId) as Task;
}

export function moveTask(db: DB, taskId: number, toColumnId: number): Task | null {
  const existing = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId) as { id: number } | undefined;
  if (!existing) return null;

  db.prepare('UPDATE tasks SET column_id = ? WHERE id = ?').run(toColumnId, taskId);

  return db
    .prepare('SELECT id, column_id, title, description, priority, created_at FROM tasks WHERE id = ?')
    .get(taskId) as Task;
}

export function deleteTask(db: DB, taskId: number): boolean {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
  return result.changes > 0;
}

export function getTasksPerColumn(db: DB, boardId: number): Array<{
  column_id: number;
  column_name: string;
  column_position: number;
  task_count: number;
}> {
  return db.prepare(TASKS_PER_COLUMN_SQL).all(boardId) as Array<{
    column_id: number;
    column_name: string;
    column_position: number;
    task_count: number;
  }>;
}
