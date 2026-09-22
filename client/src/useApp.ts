import { useCallback, useState } from 'react';
import type { SortField, SortOrder } from '@api/types.js';
import { LIST_FILTERS, type ListFilter } from '@components/TodoFilters/TodoFilters.js';

interface Query {
  filter: ListFilter;
  sortBy: SortField;
  order: SortOrder;
}

const DEFAULT_QUERY: Query = { filter: 'all', sortBy: 'createdAt', order: 'asc' };

export function useApp() {
  const [query, setQuery] = useState<Query>(DEFAULT_QUERY);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  return {
    query,
    changeQuery: (change: Partial<Query>) => {
      setQuery((current) => ({ ...current, ...change }));
      setPage(1);
    },
    onSearch: useCallback((next: string) => {
      setSearch(next);
      setPage(1);
    }, []),
    listQuery: {
      ...LIST_FILTERS[query.filter].query,
      sortBy: query.sortBy,
      order: query.order,
      search,
    },
    page,
    setPage,
  };
}
