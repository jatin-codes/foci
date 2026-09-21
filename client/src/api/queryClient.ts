import { QueryClient } from '@tanstack/react-query';
import type { TodoListQuery } from './types.js';

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

export const todoKeys = {
  all: ['todos'] as const,
  list: (query: TodoListQuery) => ['todos', 'list', query] as const,
  rowWrite: ['todos', 'rowWrite'] as const,
};
