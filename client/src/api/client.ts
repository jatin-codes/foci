import { OWNER_HEADER, ownerId } from './owner.js';
import type { Todo, TodoListQuery } from './types.js';

export interface NewTodo {
  title: string;
  description?: string;
  dueDate?: string;
}

/** Fields the user may edit. `null` clears an optional field. */
export interface TodoEdits {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
}

/** The API's error shape; every failure comes back like this. */
interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function send<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      // Every request says whose list it is for; the API refuses one that does not.
      [OWNER_HEADER]: ownerId(),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  if (!response.ok) {
    // An error body is expected, but a proxy or crash can return something else.
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new ApiError(
      response.status,
      body.error?.message ?? `Request failed (${response.status})`,
    );
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

function queryString(query: TodoListQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, value);
  }
  return params.size === 0 ? '' : `?${params}`;
}

export const api = {
  list: (query: TodoListQuery = {}) => send<Todo[]>(`/todos${queryString(query)}`),

  get: (id: string) => send<Todo>(`/todos/${id}`),

  create: (todo: NewTodo) => send<Todo>('/todos', { method: 'POST', body: JSON.stringify(todo) }),

  update: (id: string, edits: TodoEdits) =>
    send<Todo>(`/todos/${id}`, { method: 'PATCH', body: JSON.stringify(edits) }),

  remove: (id: string) => send<void>(`/todos/${id}`, { method: 'DELETE' }),

  setCompleted: (id: string, isCompleted: boolean) =>
    send<Todo>(`/todos/${id}/${isCompleted ? 'complete' : 'incomplete'}`, { method: 'POST' }),
};
