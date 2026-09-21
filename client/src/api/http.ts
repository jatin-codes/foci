import { OWNER_HEADER, TOTAL_COUNT_HEADER, type Page } from './types.js';

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

async function request(path: string, init?: RequestInit): Promise<Response> {
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

  return response;
}

export async function send<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await request(path, init);
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export async function sendForPage<T>(path: string): Promise<Page<T>> {
  const response = await request(path);
  const items = (await response.json()) as T[];
  const total = response.headers.get(TOTAL_COUNT_HEADER);
  // Without the header, the page is all we know about.
  return { items, total: total === null ? items.length : Number(total) };
}
