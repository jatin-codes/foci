import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { App } from '../../src/App.js';
import { createQueryClient } from '@api/queryClient.js';
import type { Todo } from '@api/types.js';
import { buildTodo, fakeApi, type FakeApiOptions } from './fakeApi.js';

export function renderApp(todos: Todo[] = [buildTodo()], options: FakeApiOptions = {}) {
  vi.stubGlobal('fetch', fakeApi(todos, options));

  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, staleTime: 0 } });

  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}
