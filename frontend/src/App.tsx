import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createTask, deleteTask, fetchBoard, moveTask, updateTask } from './api';
import type { BoardResponse, Priority, PriorityFilter, Task } from './types';

const PRIORITIES: Priority[] = ['Low', 'Medium', 'High'];

type DraftByColumn = Record<number, { title: string; description: string; priority: Priority }>;

type EditDraft = { title: string; description: string; priority: Priority };

export default function App() {
  const [data, setData] = useState<BoardResponse | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openNewTaskColumnId, setOpenNewTaskColumnId] = useState<number | null>(null);
  const [draftByColumn, setDraftByColumn] = useState<DraftByColumn>({});
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>({ title: '', description: '', priority: 'Medium' });

  const boardId = 1;

  const columns = data?.columns ?? [];

  const loadBoard = async (filter: PriorityFilter) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchBoard(boardId, filter);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load board');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBoard(priorityFilter);
  }, [priorityFilter]);

  const taskCount = useMemo(() => {
    if (!data) return 0;
    return Object.values(data.tasksByColumn).reduce((sum, tasks) => sum + tasks.length, 0);
  }, [data]);

  const ensureDraft = (columnId: number) => {
    if (!draftByColumn[columnId]) {
      setDraftByColumn((prev) => ({
        ...prev,
        [columnId]: { title: '', description: '', priority: 'Medium' }
      }));
    }
  };

  const handleCreateTask = async (event: FormEvent, columnId: number) => {
    event.preventDefault();
    const draft = draftByColumn[columnId];
    if (!draft) return;

    setError(null);
    try {
      await createTask({
        columnId,
        title: draft.title,
        description: draft.description,
        priority: draft.priority
      });
      setOpenNewTaskColumnId(null);
      setDraftByColumn((prev) => ({
        ...prev,
        [columnId]: { title: '', description: '', priority: 'Medium' }
      }));
      await loadBoard(priorityFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    }
  };

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditDraft({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority
    });
  };

  const handleSaveEdit = async (event: FormEvent, taskId: number) => {
    event.preventDefault();
    setError(null);
    try {
      await updateTask(taskId, {
        title: editDraft.title,
        description: editDraft.description,
        priority: editDraft.priority
      });
      setEditingTaskId(null);
      await loadBoard(priorityFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const handleDelete = async (taskId: number) => {
    setError(null);
    try {
      await deleteTask(taskId);
      await loadBoard(priorityFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  const handleMove = async (taskId: number, toColumnId: number) => {
    setError(null);
    try {
      await moveTask(taskId, toColumnId);
      await loadBoard(priorityFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move task');
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>TaskFlow</h1>
          <p className="subtitle">A lightweight Trello-style board</p>
        </div>
        <div className="header-controls">
          <label>
            Priority filter{' '}
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}>
              <option value="All">All</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </label>
          <button onClick={() => void loadBoard(priorityFilter)} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="meta-row">
        <strong>{data?.board.name ?? 'Loading board...'}</strong>
        <span>{loading ? 'Loading...' : `${taskCount} visible tasks`}</span>
      </div>

      <main className="board-grid">
        {columns.map((column) => {
          const tasks = data?.tasksByColumn[String(column.id)] ?? [];
          const isNewTaskOpen = openNewTaskColumnId === column.id;
          const draft = draftByColumn[column.id] ?? { title: '', description: '', priority: 'Medium' as Priority };

          return (
            <section key={column.id} className="column">
              <div className="column-header">
                <h2>{column.name}</h2>
                <span>{tasks.length}</span>
              </div>

              <button
                className="new-task-btn"
                onClick={() => {
                  ensureDraft(column.id);
                  setOpenNewTaskColumnId(isNewTaskOpen ? null : column.id);
                }}
              >
                {isNewTaskOpen ? 'Close' : 'New Task'}
              </button>

              {isNewTaskOpen && (
                <form className="task-form" onSubmit={(e) => void handleCreateTask(e, column.id)}>
                  <input
                    placeholder="Title"
                    value={draft.title}
                    onChange={(e) =>
                      setDraftByColumn((prev) => ({
                        ...prev,
                        [column.id]: { ...draft, title: e.target.value }
                      }))
                    }
                    required
                  />
                  <textarea
                    placeholder="Description"
                    value={draft.description}
                    onChange={(e) =>
                      setDraftByColumn((prev) => ({
                        ...prev,
                        [column.id]: { ...draft, description: e.target.value }
                      }))
                    }
                  />
                  <select
                    value={draft.priority}
                    onChange={(e) =>
                      setDraftByColumn((prev) => ({
                        ...prev,
                        [column.id]: { ...draft, priority: e.target.value as Priority }
                      }))
                    }
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                  <button type="submit">Create Task</button>
                </form>
              )}

              <div className="task-list">
                {tasks.map((task) => {
                  const isEditing = editingTaskId === task.id;
                  return (
                    <article key={task.id} className="task-card">
                      {isEditing ? (
                        <form className="task-form" onSubmit={(e) => void handleSaveEdit(e, task.id)}>
                          <input
                            value={editDraft.title}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, title: e.target.value }))}
                            required
                          />
                          <textarea
                            value={editDraft.description}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, description: e.target.value }))}
                          />
                          <select
                            value={editDraft.priority}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, priority: e.target.value as Priority }))}
                          >
                            {PRIORITIES.map((priority) => (
                              <option key={priority} value={priority}>
                                {priority}
                              </option>
                            ))}
                          </select>
                          <div className="row gap">
                            <button type="submit">Save</button>
                            <button type="button" onClick={() => setEditingTaskId(null)}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <h3>{task.title}</h3>
                          {task.description && <p>{task.description}</p>}
                          <div className="task-meta">
                            <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                            <small>{new Date(task.created_at).toLocaleString()}</small>
                          </div>
                          <div className="row gap">
                            <button onClick={() => startEdit(task)}>Edit</button>
                            <button className="danger" onClick={() => void handleDelete(task.id)}>
                              Delete
                            </button>
                          </div>
                          <label className="move-control">
                            Move to:{' '}
                            <select
                              value={task.column_id}
                              onChange={(e) => void handleMove(task.id, Number(e.target.value))}
                            >
                              {columns.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
