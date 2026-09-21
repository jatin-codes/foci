import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

// Every list query is keyed by the query it ran, so each filter caches separately.
export const todoKeys = {
  all: ['todos'] as const,
  list: (query: unknown) => ['todos', 'list', query] as const,
  /** Mutations that act on one existing row; their variables always carry its `id`. */
  rowWrite: ['todos', 'rowWrite'] as const,
};
