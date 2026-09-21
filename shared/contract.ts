// The HTTP contract between the server and the client: what travels over the wire and the
// limits both sides enforce. It is the one module both halves import, so it holds plain types
// and constants only - no runtime dependencies, and nothing from either side.

/** Names whose list a request is for. Every request to `/todos` must carry it. */
export const OWNER_HEADER = 'X-Owner-Id';
export const OWNER_ID_MAX_LENGTH = 100;

export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const SEARCH_MAX_LENGTH = 200;
/** The largest page `GET /todos` returns when a `limit` is given. */
export const PAGE_SIZE_MAX = 100;
/** Response header on `GET /todos` counting every match, not just the page returned. */
export const TOTAL_COUNT_HEADER = 'X-Total-Count';

// The values `GET /todos` accepts, in the order a UI would offer them.
export const STATUS_FILTERS = ['all', 'incomplete', 'completed', 'overdue'] as const;
export const SORT_FIELDS = ['createdAt', 'dueDate', 'title'] as const;
export const SORT_ORDERS = ['asc', 'desc'] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number];
export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

/** Query parameters for `GET /todos`. Omitted ones fall back to: every to-do, oldest first. */
export interface TodoListQuery {
  status?: StatusFilter;
  sortBy?: SortField;
  order?: SortOrder;
  /** Free text matched against title and description. */
  search?: string;
  /** At most this many to-dos, 1 to PAGE_SIZE_MAX. Omitted, every match is returned. */
  limit?: number;
  /** How many matches to skip before the page starts. Defaults to 0. */
  offset?: number;
}

/** A to-do as every endpoint returns it. Optional fields are `null`, never omitted. */
export interface TodoResource {
  id: string;
  title: string;
  description: string | null;
  /** Calendar date in YYYY-MM-DD format. */
  dueDate: string | null;
  isCompleted: boolean;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** Incomplete with a due date before today; worked out by the server, which owns the clock. */
  isOverdue: boolean;
}
