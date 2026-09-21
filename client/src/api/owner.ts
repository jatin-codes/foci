const STORAGE_KEY = 'todo.ownerId';

export const OWNER_HEADER = 'X-Owner-Id';

/**
 * Identifies whose list this browser sees. Generated once and kept in
 * localStorage, so the same browser returns to the same to-dos and a different
 * browser starts empty.
 *
 * This is not a login: the id is only a name for a list, and anyone who knows
 * another id can ask for that list. Swapping it for a real session is a change
 * to this file and the header it feeds, not to anything below.
 */
export function ownerId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;

    const created = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    // Private browsing and blocked storage both throw. A per-session id still
    // works; it just will not survive a reload.
    return (sessionOwnerId ??= crypto.randomUUID());
  }
}

let sessionOwnerId: string | undefined;
