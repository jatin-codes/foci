export {
  DESCRIPTION_MAX_LENGTH,
  OWNER_HEADER,
  SEARCH_MAX_LENGTH,
  SORT_FIELDS,
  TITLE_MAX_LENGTH,
  TOTAL_COUNT_HEADER,
  type SortField,
  type SortOrder,
  type TodoResource as Todo,
  type TodoListQuery,
} from '@shared/contract.js';

export interface Page<T> {
  items: T[];
  total: number;
}

export interface TodoEdits {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  isCompleted?: boolean;
}
