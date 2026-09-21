import { vi } from 'vitest';
import type { Todo } from '../../src/api/types.js';

export function buildTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'todo-1',
    title: 'Buy milk',
    description: null,
    dueDate: null,
    isCompleted: false,
    createdAt: '2025-01-01T09:00:00.000Z',
    isOverdue: false,
    ...overrides,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

export interface FakeApiOptions {
  /** Every write waits on this promise, so the pending state can be observed before it lands. */
  hold?: Promise<void>;
  /** How many writes, from the first, fail with a 500 before the API recovers. */
  failWrites?: number;
}

export const WRITE_FAILURE_MESSAGE = 'The server could not save that';

/**
 * A stand-in for the API: enough of the server's behaviour for the components to
 * exercise, backed by a list the test can seed. Filtering and sorting really happen
 * on the server, so here the query only has to be honoured, not reimplemented.
 */
export function fakeApi(initial: Todo[] = [], { hold, failWrites = 0 }: FakeApiOptions = {}) {
  let todos = [...initial];
  let nextId = initial.length + 1;
  let failuresLeft = failWrites;

  return vi.fn(async (input: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const [path = '', search = ''] = input.split('?');
    const body = init?.body ? (JSON.parse(init.body as string) as Partial<Todo>) : {};
    const idFrom = (suffix = '') => path.replace('/todos/', '').replace(suffix, '');

    if (hold && method !== 'GET') await hold;

    if (method !== 'GET' && failuresLeft > 0) {
      failuresLeft--;
      return json({ error: { code: 'INTERNAL_ERROR', message: WRITE_FAILURE_MESSAGE } }, 500);
    }

    if (path === '/todos' && method === 'GET') {
      const params = new URLSearchParams(search);
      const status = params.get('status');
      const needle = (params.get('search') ?? '').toLowerCase();

      const matchesStatus = (todo: Todo) =>
        status === 'completed'
          ? todo.isCompleted
          : status === 'incomplete'
            ? !todo.isCompleted
            : true;
      const matchesSearch = (todo: Todo) =>
        needle === '' ||
        todo.title.toLowerCase().includes(needle) ||
        (todo.description?.toLowerCase().includes(needle) ?? false);

      return json(todos.filter((todo) => matchesStatus(todo) && matchesSearch(todo)));
    }

    if (path === '/todos' && method === 'POST') {
      const created = buildTodo({ id: `todo-${nextId++}`, ...body });
      todos = [...todos, created];
      return json(created, 201);
    }

    if (method === 'PATCH') {
      const id = idFrom();
      todos = todos.map((todo) => (todo.id === id ? { ...todo, ...body } : todo));
      return json(todos.find((todo) => todo.id === id));
    }

    if (method === 'DELETE') {
      todos = todos.filter((todo) => todo.id !== idFrom());
      return new Response(null, { status: 204 });
    }

    if (path.endsWith('/complete') || path.endsWith('/incomplete')) {
      const isCompleted = !path.endsWith('/incomplete');
      const id = idFrom(isCompleted ? '/complete' : '/incomplete');
      todos = todos.map((todo) => (todo.id === id ? { ...todo, isCompleted } : todo));
      return json(todos.find((todo) => todo.id === id));
    }

    throw new Error(`Unhandled request: ${method} ${input}`);
  });
}
