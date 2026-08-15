import type { BoardResponse, Priority, PriorityFilter, Task } from './types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(data.error ?? 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function fetchBoard(boardId: number, priority: PriorityFilter): Promise<BoardResponse> {
  const params = new URLSearchParams();
  params.set('priority', priority);
  return request<BoardResponse>(`/api/boards/${boardId}?${params.toString()}`);
}

export function createTask(input: {
  columnId: number;
  title: string;
  description?: string;
  priority?: Priority;
}): Promise<Task> {
  return request<Task>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function updateTask(taskId: number, input: { title: string; description?: string; priority?: Priority }): Promise<Task> {
  return request<Task>(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export function moveTask(taskId: number, toColumnId: number): Promise<Task> {
  return request<Task>(`/api/tasks/${taskId}/move`, {
    method: 'PATCH',
    body: JSON.stringify({ toColumnId })
  });
}

export function deleteTask(taskId: number): Promise<void> {
  return request<void>(`/api/tasks/${taskId}`, { method: 'DELETE' });
}
