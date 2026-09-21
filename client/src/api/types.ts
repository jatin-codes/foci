// The client's own copy of the API contract, as documented in the README. The client
// never imports server code, so the two halves build and deploy independently.

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  /** Calendar date in YYYY-MM-DD format. */
  dueDate: string | null;
  isCompleted: boolean;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

// The values the API accepts, in the order the UI offers them.
export const STATUS_FILTERS = ['all', 'incomplete', 'completed', 'overdue'] as const;
export const SORT_FIELDS = ['createdAt', 'dueDate', 'title'] as const;
export const SORT_ORDERS = ['asc', 'desc'] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number];
export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

/** Query parameters for `GET /todos`. Omitted ones fall back to the API's defaults. */
export interface TodoListQuery {
  status?: StatusFilter;
  sortBy?: SortField;
  order?: SortOrder;
  search?: string;
}

/** Fields the user may edit. `null` clears an optional field; omitting one leaves it. */
export interface TodoEdits {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
}
