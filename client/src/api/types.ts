export {
  DESCRIPTION_MAX_LENGTH,
  OWNER_HEADER,
  SEARCH_MAX_LENGTH,
  SORT_FIELDS,
  STATUS_FILTERS,
  TITLE_MAX_LENGTH,
  type SortField,
  type SortOrder,
  type StatusFilter,
  type TodoResource as Todo,
  type TodoListQuery,
} from '@shared/contract.js';

export interface TodoEdits {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
}
