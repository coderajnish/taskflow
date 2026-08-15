export const TASKS_PER_COLUMN_SQL = `
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
`;

export const TASKS_BY_PRIORITY_SQL = `
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
`;
