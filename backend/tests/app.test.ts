import request from 'supertest';
import { beforeEach, afterEach, describe, expect, test } from 'vitest';
import { createApp } from '../src/app.js';
import { TASKS_PER_COLUMN_SQL } from '../src/queries.js';
import { setupTestDatabase, type TestContext } from './helpers.js';

describe('TaskFlow backend', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = setupTestDatabase();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  test('creating task with empty title fails with 400', async () => {
    const app = createApp(ctx.db);

    const response = await request(app).post('/api/tasks').send({
      columnId: 1,
      title: '   ',
      description: 'Should fail',
      priority: 'High'
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'title is required' });
  });

  test('moving a task updates its column correctly', async () => {
    const app = createApp(ctx.db);

    const response = await request(app).patch('/api/tasks/1/move').send({ toColumnId: 2 });

    expect(response.status).toBe(200);
    expect(response.body.column_id).toBe(2);

    const row = ctx.db.prepare('SELECT column_id FROM tasks WHERE id = ?').get(1) as { column_id: number };
    expect(row.column_id).toBe(2);
  });

  test('moving a task to unknown column returns 400', async () => {
    const app = createApp(ctx.db);

    const response = await request(app).patch('/api/tasks/1/move').send({ toColumnId: 99999 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'toColumnId does not exist' });
  });

  test('tasks-per-column query returns expected counts from seed data', () => {
    const rows = ctx.db.prepare(TASKS_PER_COLUMN_SQL).all(1) as Array<{
      column_id: number;
      column_name: string;
      column_position: number;
      task_count: number;
    }>;

    expect(rows).toEqual([
      { column_id: 1, column_name: 'To Do', column_position: 1, task_count: 2 },
      { column_id: 2, column_name: 'In Progress', column_position: 2, task_count: 1 },
      { column_id: 3, column_name: 'Done', column_position: 3, task_count: 1 }
    ]);
  });
});
