import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import type { DB } from './db.js';
import {
  createTask,
  deleteTask,
  getBoardView,
  getTasksPerColumn,
  moveTask,
  updateTask
} from './repository.js';
import type { Priority, PriorityFilter } from './types.js';

const VALID_PRIORITIES = new Set<Priority>(['Low', 'Medium', 'High']);

function parsePriorityFilter(raw: string | undefined): PriorityFilter {
  if (!raw || raw === 'All') return 'All';
  if (raw === 'Low' || raw === 'Medium' || raw === 'High') return raw;
  throw badRequest('priority must be one of All, Low, Medium, High');
}

function parsePriority(raw: unknown): Priority {
  if (typeof raw !== 'string') return 'Medium';
  if (VALID_PRIORITIES.has(raw as Priority)) return raw as Priority;
  throw badRequest('priority must be one of Low, Medium, High');
}

function requireTrimmedTitle(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw badRequest('title is required');
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    throw badRequest('title is required');
  }

  return trimmed;
}

function badRequest(message: string): Error & { status: number } {
  const err = new Error(message) as Error & { status: number };
  err.status = 400;
  return err;
}

function existsBoard(db: DB, boardId: number): boolean {
  const row = db.prepare('SELECT id FROM boards WHERE id = ?').get(boardId) as { id: number } | undefined;
  return Boolean(row);
}

function existsColumn(db: DB, columnId: number): boolean {
  const row = db.prepare('SELECT id FROM columns WHERE id = ?').get(columnId) as { id: number } | undefined;
  return Boolean(row);
}

export function createApp(db: DB) {
  const app = express();

  app.use(cors({ origin: 'http://localhost:5173' }));
  app.use(express.json());

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.get('/api/boards/:boardId', (req: Request, res: Response, next: NextFunction) => {
    try {
      const boardId = Number(req.params.boardId);
      if (!Number.isInteger(boardId) || boardId <= 0) {
        throw badRequest('boardId must be a positive integer');
      }

      const priority = parsePriorityFilter(req.query.priority as string | undefined);
      const boardView = getBoardView(db, boardId, priority);

      if (!boardView) {
        return res.status(404).json({ error: 'Board not found' });
      }

      return res.json(boardView);
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/boards/:boardId/stats/tasks-per-column', (req: Request, res: Response, next: NextFunction) => {
    try {
      const boardId = Number(req.params.boardId);
      if (!Number.isInteger(boardId) || boardId <= 0) {
        throw badRequest('boardId must be a positive integer');
      }

      if (!existsBoard(db, boardId)) {
        return res.status(404).json({ error: 'Board not found' });
      }

      const rows = getTasksPerColumn(db, boardId);
      return res.json({ boardId, counts: rows });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/tasks', (req: Request, res: Response, next: NextFunction) => {
    try {
      const columnId = Number(req.body.columnId);
      if (!Number.isInteger(columnId) || columnId <= 0) {
        throw badRequest('columnId must be a positive integer');
      }

      if (!existsColumn(db, columnId)) {
        throw badRequest('columnId does not exist');
      }

      const title = requireTrimmedTitle(req.body.title);
      const description = typeof req.body.description === 'string' ? req.body.description.trim() : undefined;
      const priority = parsePriority(req.body.priority);

      const task = createTask(db, { columnId, title, description, priority });
      return res.status(201).json(task);
    } catch (error) {
      return next(error);
    }
  });

  app.patch('/api/tasks/:taskId', (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = Number(req.params.taskId);
      if (!Number.isInteger(taskId) || taskId <= 0) {
        throw badRequest('taskId must be a positive integer');
      }

      const title = requireTrimmedTitle(req.body.title);
      const description = typeof req.body.description === 'string' ? req.body.description.trim() : undefined;
      const priority = parsePriority(req.body.priority);

      const updated = updateTask(db, taskId, { title, description, priority });
      if (!updated) {
        return res.status(404).json({ error: 'Task not found' });
      }

      return res.json(updated);
    } catch (error) {
      return next(error);
    }
  });

  app.patch('/api/tasks/:taskId/move', (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = Number(req.params.taskId);
      const toColumnId = Number(req.body.toColumnId);

      if (!Number.isInteger(taskId) || taskId <= 0) {
        throw badRequest('taskId must be a positive integer');
      }

      if (!Number.isInteger(toColumnId) || toColumnId <= 0) {
        throw badRequest('toColumnId must be a positive integer');
      }

      if (!existsColumn(db, toColumnId)) {
        throw badRequest('toColumnId does not exist');
      }

      const moved = moveTask(db, taskId, toColumnId);
      if (!moved) {
        return res.status(404).json({ error: 'Task not found' });
      }

      return res.json(moved);
    } catch (error) {
      return next(error);
    }
  });

  app.delete('/api/tasks/:taskId', (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = Number(req.params.taskId);
      if (!Number.isInteger(taskId) || taskId <= 0) {
        throw badRequest('taskId must be a positive integer');
      }

      const deleted = deleteTask(db, taskId);
      if (!deleted) {
        return res.status(404).json({ error: 'Task not found' });
      }

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status ?? 500;
    const message = status >= 500 ? 'Internal server error' : err.message;
    res.status(status).json({ error: message });
  });

  return app;
}
