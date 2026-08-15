INSERT INTO boards (id, name) VALUES (1, 'TaskFlow Board');

INSERT INTO columns (id, board_id, name, position) VALUES
  (1, 1, 'To Do', 1),
  (2, 1, 'In Progress', 2),
  (3, 1, 'Done', 3);

INSERT INTO tasks (id, column_id, title, description, priority) VALUES
  (1, 1, 'Set up repository', 'Create backend and frontend structure', 'High'),
  (2, 1, 'Design database schema', 'Define relational model for board/columns/tasks', 'Medium'),
  (3, 2, 'Build API endpoints', 'Implement task CRUD and board query routes', 'High'),
  (4, 3, 'Write README', 'Document setup and architecture decisions', 'Low');
