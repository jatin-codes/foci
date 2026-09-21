import { isOverdue, type Todo } from '../domain/todo.js';

export const STATUS_FILTERS = ['all', 'completed', 'incomplete', 'overdue'] as const;
export const SORT_FIELDS = ['createdAt', 'dueDate', 'title'] as const;
export const SORT_ORDERS = ['asc', 'desc'] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number];
export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

/** Omitted options fall back to: every to-do, oldest first, unsearched. */
export interface TodoListQuery {
  status?: StatusFilter;
  sortBy?: SortField;
  order?: SortOrder;
  /** Free text matched against title and description. */
  search?: string;
}

const matchesStatus: Record<StatusFilter, (todo: Todo, today: string) => boolean> = {
  all: () => true,
  completed: (todo) => todo.isCompleted,
  incomplete: (todo) => !todo.isCompleted,
  overdue: isOverdue,
};

/**
 * Case-insensitive substring match over the two fields that hold prose. Accents and
 * word stems are not normalised: this is a find-as-you-type filter, not a search engine.
 */
function matchesSearch(todo: Todo, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (needle === '') return true;

  return (
    todo.title.toLowerCase().includes(needle) ||
    (todo.description?.toLowerCase().includes(needle) ?? false)
  );
}

// ISO timestamps and calendar dates sort chronologically as plain strings.
const sortKey: Record<SortField, (todo: Todo) => string | null> = {
  createdAt: (todo) => todo.createdAt,
  dueDate: (todo) => todo.dueDate,
  title: (todo) => todo.title.toLowerCase(),
};

/** Filters and sorts without mutating the input. `today` is a YYYY-MM-DD calendar date. */
export function queryTodos(todos: readonly Todo[], query: TodoListQuery, today: string): Todo[] {
  const { status = 'all', sortBy = 'createdAt', order = 'asc', search = '' } = query;
  const direction = order === 'asc' ? 1 : -1;
  const keyOf = sortKey[sortBy];

  return todos
    .filter((todo) => matchesStatus[status](todo, today) && matchesSearch(todo, search))
    .sort((a, b) => {
      const keyA = keyOf(a);
      const keyB = keyOf(b);
      if (keyA === keyB) return 0; // the sort is stable, so ties keep their creation order
      if (keyA === null) return 1; // to-dos without a value go last, whatever the direction
      if (keyB === null) return -1;
      return keyA < keyB ? -direction : direction;
    });
}
