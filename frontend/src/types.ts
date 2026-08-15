export type Priority = 'Low' | 'Medium' | 'High';
export type PriorityFilter = Priority | 'All';

export interface Board {
  id: number;
  name: string;
}

export interface BoardColumn {
  id: number;
  board_id: number;
  name: string;
  position: number;
}

export interface Task {
  id: number;
  column_id: number;
  title: string;
  description: string | null;
  priority: Priority;
  created_at: string;
}

export interface BoardResponse {
  board: Board;
  columns: BoardColumn[];
  tasksByColumn: Record<string, Task[]>;
}
