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

export interface TodoView extends Todo {
  readonly isOverdue: boolean;
}

export interface CreateTodoInput {
  title: string;
  description?: string | null;
  dueDate?: string | null;
}

export interface TodoChanges {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  isCompleted?: boolean;
}

export function applyChanges(todo: Todo, changes: TodoChanges): Todo {
  const provided = Object.entries(changes).filter(([, value]) => value !== undefined);
  return { ...todo, ...Object.fromEntries(provided) };
}

export function isOverdue(todo: Todo, today: string): boolean {
  return !todo.isCompleted && todo.dueDate !== null && todo.dueDate < today;
}

export function toView(todo: Todo, today: string): TodoView {
  return { ...todo, isOverdue: isOverdue(todo, today) };
}
