export const OWNER_HEADER = 'X-Owner-Id';
export const OWNER_ID_MAX_LENGTH = 100;

export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const SEARCH_MAX_LENGTH = 200;
export const PAGE_SIZE_MAX = 100;
export const TOTAL_COUNT_HEADER = 'X-Total-Count';

export const SORT_FIELDS = ['createdAt', 'dueDate', 'title'] as const;
export const SORT_ORDERS = ['asc', 'desc'] as const;

export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

export interface TodoListQuery {
  isCompleted?: boolean;
  overdue?: boolean;
  sortBy?: SortField;
  order?: SortOrder;
  search?: string;
  /** At most this many to-dos, 1 to PAGE_SIZE_MAX. Omitted, every match is returned. */
  limit?: number;
  offset?: number;
}

export interface TodoResource {
  id: string;
  title: string;
  description: string | null;
  /** Calendar date in YYYY-MM-DD format. */
  dueDate: string | null;
  isCompleted: boolean;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** Worked out by the server, which owns the clock. */
  isOverdue: boolean;
}
