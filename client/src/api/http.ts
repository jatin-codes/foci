import { OWNER_HEADER } from './types.js';

const OWNER_STORAGE_KEY = 'todo.ownerId';

let sessionOwnerId: string | undefined;

export function ownerId(): string {
  try {
    const stored = localStorage.getItem(OWNER_STORAGE_KEY);
    if (stored) return stored;

    const created = crypto.randomUUID();
    localStorage.setItem(OWNER_STORAGE_KEY, created);
    return created;
  } catch {
    // Blocked storage throws; fall back to an id for this session.
    return (sessionOwnerId ??= crypto.randomUUID());
  }
}

export async function send<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      [OWNER_HEADER]: ownerId(),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(body.error?.message ?? `Request failed (${response.status})`);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}
