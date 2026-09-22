import type { SortField, TodoListQuery } from '../../../shared/contract.js';
import { isOverdue, type Todo } from '../domain/todo.js';

function matchesFilters(todo: Todo, query: TodoListQuery, today: string): boolean {
  const { isCompleted, overdue } = query;
  return (
    (isCompleted === undefined || todo.isCompleted === isCompleted) &&
    (overdue === undefined || isOverdue(todo, today) === overdue)
  );
}

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

const compareKeys: Record<SortField, (a: string, b: string) => number> = {
  createdAt: compareStrings,
  dueDate: compareStrings,
  // A fixed locale keeps the order the same on every machine.
  title: new Intl.Collator('en', { sensitivity: 'base', numeric: true }).compare,
};

export function queryTodos(todos: readonly Todo[], query: TodoListQuery, today: string): Todo[] {
  const { sortBy = 'createdAt', order = 'asc', search = '' } = query;
  const direction = order === 'asc' ? 1 : -1;
  const keyOf = sortKey[sortBy];
  const compare = compareKeys[sortBy];

  return todos
    .filter((todo) => matchesFilters(todo, query, today) && matchesSearch(todo, search))
    .sort((a, b) => {
      const keyA = keyOf(a);
      const keyB = keyOf(b);
      if (keyA === keyB) return 0; // the sort is stable, so ties keep their creation order
      if (keyA === null) return 1; // to-dos without a value go last, whatever the direction
      if (keyB === null) return -1;
      return compare(keyA, keyB) * direction;
    });
}
