// The API contract, from the one module the server and the client share. The client never
// imports server code: `shared/` holds plain types and constants only, so the two halves
// still build and deploy independently.
export {
  DESCRIPTION_MAX_LENGTH,
  OWNER_HEADER,
  SEARCH_MAX_LENGTH,
  SORT_FIELDS,
  SORT_ORDERS,
  STATUS_FILTERS,
  TITLE_MAX_LENGTH,
  type SortField,
  type SortOrder,
  type StatusFilter,
  type TodoResource as Todo,
  type TodoListQuery,
} from '../../../shared/contract.js';

/** Fields the user may edit. `null` clears an optional field; omitting one leaves it. */
export interface TodoEdits {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
}
