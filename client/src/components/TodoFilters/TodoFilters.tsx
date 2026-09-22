import { SORT_FIELDS, type SortField, type SortOrder, type TodoListQuery } from '@api/types.js';
import './TodoFilters.css';

export const LIST_FILTERS = {
  all: { label: 'All', query: {} },
  incomplete: { label: 'Incomplete', query: { isCompleted: false } },
  completed: { label: 'Completed', query: { isCompleted: true } },
  overdue: { label: 'Overdue', query: { overdue: true } },
} satisfies Record<
  string,
  { label: string; query: Pick<TodoListQuery, 'isCompleted' | 'overdue'> }
>;

export type ListFilter = keyof typeof LIST_FILTERS;

const SORT_LABELS: Record<SortField, string> = {
  createdAt: 'Created',
  dueDate: 'Due date',
  title: 'Title',
};

interface TodoFiltersChange {
  filter?: ListFilter;
  sortBy?: SortField;
  order?: SortOrder;
}

interface Props {
  filter: ListFilter;
  sortBy: SortField;
  order: SortOrder;
  onChange: (change: TodoFiltersChange) => void;
}

export function TodoFilters({ filter, sortBy, order, onChange }: Props) {
  return (
    <div className="filters">
      <div className="filter-statuses" role="group" aria-label="Filter the list">
        {(Object.keys(LIST_FILTERS) as ListFilter[]).map((value) => (
          <button
            key={value}
            type="button"
            className={value === filter ? 'chip selected' : 'chip'}
            aria-pressed={value === filter}
            onClick={() => onChange({ filter: value })}
          >
            {LIST_FILTERS[value].label}
          </button>
        ))}
      </div>

      <label className="filter-sort">
        Sort by{' '}
        <select
          value={sortBy}
          onChange={(event) => onChange({ sortBy: event.target.value as SortField })}
        >
          {SORT_FIELDS.map((field) => (
            <option key={field} value={field}>
              {SORT_LABELS[field]}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="chip"
        onClick={() => onChange({ order: order === 'asc' ? 'desc' : 'asc' })}
        aria-label={`Sorted ${order === 'asc' ? 'ascending' : 'descending'}; click to reverse`}
      >
        {order === 'asc' ? '↑' : '↓'}
      </button>
    </div>
  );
}
