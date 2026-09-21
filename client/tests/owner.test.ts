import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OWNER_HEADER, ownerId } from '../src/api/http.js';

describe('ownerId', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('returns the same id on every call', () => {
    expect(ownerId()).toBe(ownerId());
  });

  it('keeps the id across reloads by storing it', () => {
    const first = ownerId();

    // A reload re-reads localStorage rather than generating a new id.
    expect(localStorage.getItem('todo.ownerId')).toBe(first);
  });

  it('gives a different browser a different id', () => {
    const first = ownerId();
    localStorage.clear();

    expect(ownerId()).not.toBe(first);
  });

  it('names the header the API expects', () => {
    expect(OWNER_HEADER).toBe('X-Owner-Id');
  });
});
