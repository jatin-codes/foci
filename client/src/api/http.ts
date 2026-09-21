import { OWNER_HEADER } from './types.js';

const OWNER_STORAGE_KEY = 'todo.ownerId';

let sessionOwnerId: string | undefined;

/**
 * Names whose list this browser sees: generated once and kept in localStorage,
 * so the same browser returns to the same to-dos and another starts empty. It
 * separates lists; it does not secure them.
 */
export function ownerId(): string {
  try {
    const stored = localStorage.getItem(OWNER_STORAGE_KEY);
    if (stored) return stored;

    const created = crypto.randomUUID();
    localStorage.setItem(OWNER_STORAGE_KEY, created);
    return created;
  } catch {
    // Private browsing and blocked storage both throw; a per-session id still works.
    return (sessionOwnerId ??= crypto.randomUUID());
  }
}

/**
 * The only place that calls fetch. Every request names its owner, JSON bodies
 * are labelled, and a failure is thrown with the API's own message.
 */
export async function send<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      [OWNER_HEADER]: ownerId(),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  if (!response.ok) {
    // An error body is expected, but a proxy or crash can return something else.
    const body = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(body.error?.message ?? `Request failed (${response.status})`);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}
