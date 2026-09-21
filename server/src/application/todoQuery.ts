import type { SortField, StatusFilter, TodoListQuery } from '../../../shared/contract.js';
import { isOverdue, type Todo } from '../domain/todo.js';

// The filter and sort vocabulary is part of the API contract, so it is defined there.
export type { TodoListQuery };

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

const sortKey: Record<SortField, (todo: Todo) => string | null> = {
  createdAt: (todo) => todo.createdAt,
  dueDate: (todo) => todo.dueDate,
  title: (todo) => todo.title,
};

const compareStrings = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// ISO timestamps and calendar dates sort chronologically as plain strings. Titles are sorted
// the way people read them: ignoring case and accents, with "Task 2" before "Task 10". The
// locale is fixed so the order does not depend on the machine the server runs on.
const compareKeys: Record<SortField, (a: string, b: string) => number> = {
  createdAt: compareStrings,
  dueDate: compareStrings,
  title: new Intl.Collator('en', { sensitivity: 'base', numeric: true }).compare,
};

/** Filters and sorts without mutating the input. `today` is a YYYY-MM-DD calendar date. */
export function queryTodos(todos: readonly Todo[], query: TodoListQuery, today: string): Todo[] {
  const { status = 'all', sortBy = 'createdAt', order = 'asc', search = '' } = query;
  const direction = order === 'asc' ? 1 : -1;
  const keyOf = sortKey[sortBy];
  const compare = compareKeys[sortBy];

  return todos
    .filter((todo) => matchesStatus[status](todo, today) && matchesSearch(todo, search))
    .sort((a, b) => {
      const keyA = keyOf(a);
      const keyB = keyOf(b);
      if (keyA === keyB) return 0; // the sort is stable, so ties keep their creation order
      if (keyA === null) return 1; // to-dos without a value go last, whatever the direction
      if (keyB === null) return -1;
      return compare(keyA, keyB) * direction;
    });
}
