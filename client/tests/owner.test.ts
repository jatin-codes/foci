import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ownerId } from '@api/http.js';

describe('ownerId', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('returns the same id on every call', () => {
    expect(ownerId()).toBe(ownerId());
  });

  it('keeps the id across reloads by storing it', () => {
    const first = ownerId();

    expect(localStorage.getItem('todo.ownerId')).toBe(first);
  });

  it('gives a different browser a different id', () => {
    const first = ownerId();
    localStorage.clear();

    expect(ownerId()).not.toBe(first);
  });

  it('falls back to one id for the session when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    const first = ownerId();

    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(ownerId()).toBe(first);
  });
});
