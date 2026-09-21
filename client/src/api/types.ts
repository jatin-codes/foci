// The client's view of the API contract. Type-only imports from the server keep the
// two from drifting; nothing from the server is bundled into the client.
export type { Todo } from '../../../server/src/domain/todo.js';
export type {
  SortField,
  SortOrder,
  StatusFilter,
  TodoListQuery,
} from '../../../server/src/application/todoQuery.js';

// The values the API accepts, in the order the UI offers them.
export const STATUS_FILTERS = ['all', 'incomplete', 'completed', 'overdue'] as const;
export const SORT_FIELDS = ['createdAt', 'dueDate', 'title'] as const;

/** Fields the user may edit. `null` clears an optional field; omitting one leaves it. */
export interface TodoEdits {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
}
