export interface Todo {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  /** Calendar date in YYYY-MM-DD format. */
  readonly dueDate: string | null;
  readonly isCompleted: boolean;
  /** ISO 8601 timestamp. */
  readonly createdAt: string;
}

export interface CreateTodoInput {
  title: string;
  description?: string | null;
  dueDate?: string | null;
}

/** User-editable fields. An omitted field is left untouched; `null` clears it. */
export interface UpdateTodoInput {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
}

/** Every change that can be applied to a stored to-do. */
export type TodoChanges = UpdateTodoInput & { isCompleted?: boolean };

export function applyChanges(todo: Todo, changes: TodoChanges): Todo {
  const provided = Object.entries(changes).filter(([, value]) => value !== undefined);
  return { ...todo, ...Object.fromEntries(provided) };
}

/** A to-do is overdue once its due date has passed without it being completed. */
export function isOverdue(todo: Todo, today: string): boolean {
  return !todo.isCompleted && todo.dueDate !== null && todo.dueDate < today;
}
