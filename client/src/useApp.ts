import { useCallback, useState } from 'react';
import type { SortField, SortOrder, StatusFilter } from './api/types.js';

export interface Query {
  status: StatusFilter;
  sortBy: SortField;
  order: SortOrder;
}

const DEFAULT_QUERY: Query = { status: 'all', sortBy: 'createdAt', order: 'asc' };

export function useApp() {
  const [query, setQuery] = useState<Query>(DEFAULT_QUERY);
  const [search, setSearch] = useState('');

  return {
    query,
    changeQuery: (change: Partial<Query>) => setQuery({ ...query, ...change }),
    onSearch: useCallback((next: string) => setSearch(next), []),
    listQuery: { ...query, search },
  };
}
