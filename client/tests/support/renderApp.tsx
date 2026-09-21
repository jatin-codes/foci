import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { App } from '../../src/App.js';
import { createQueryClient } from '../../src/api/queryClient.js';
import type { Todo } from '../../src/api/types.js';
import { buildTodo, fakeApi } from './fakeApi.js';

/**
 * Renders the app against a stubbed API and a cache of its own, so no test can
 * see another's data. Retries are off: a test that fails should fail at once.
 */
export function renderApp(todos: Todo[] = [buildTodo()], hold?: Promise<void>) {
  vi.stubGlobal('fetch', fakeApi(todos, hold));

  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, staleTime: 0 } });

  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}
