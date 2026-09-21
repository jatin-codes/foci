import {
  SORT_FIELDS,
  STATUS_FILTERS,
  type SortField,
  type SortOrder,
  type StatusFilter,
} from '../../api/types.js';
import './TodoFilters.css';

/** How each sort field is named on screen. UI copy, so it lives with the UI. */
const SORT_LABELS: Record<SortField, string> = {
  createdAt: 'Created',
  dueDate: 'Due date',
  title: 'Title',
};

export interface TodoFiltersChange {
  status?: StatusFilter;
  sortBy?: SortField;
  order?: SortOrder;
}

interface Props {
  status: StatusFilter;
  sortBy: SortField;
  order: SortOrder;
  onChange: (change: TodoFiltersChange) => void;
}

function label(status: string): string {
  return status === 'all' ? 'All' : status[0]!.toUpperCase() + status.slice(1);
}

/**
 * Chooses the query; the API applies it. Fully controlled, so it holds no state
 * of its own and needs no hook.
 */
export function TodoFilters({ status, sortBy, order, onChange }: Props) {
  return (
    <div className="filters">
      <div className="filter-statuses" role="group" aria-label="Filter by status">
        {STATUS_FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            className={value === status ? 'chip selected' : 'chip'}
            aria-pressed={value === status}
            onClick={() => onChange({ status: value })}
          >
            {label(value)}
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
