import type { Request } from 'express';
import { z } from 'zod';
import { validate } from './validation.js';

export const OWNER_HEADER = 'X-Owner-Id';

/**
 * Identifies whose list a request is for. This scopes data; it does not protect
 * it. The id is supplied by the client and never checked against a secret, so
 * anyone who knows another owner's id can read that list. Real multi-user access
 * would authenticate the caller and derive the owner from the session instead -
 * that change would land here, and nothing below this layer would move.
 */
const ownerIdSchema = z
  .string({
    error: ({ input }) =>
      input === undefined
        ? `${OWNER_HEADER} header is required`
        : `${OWNER_HEADER} must be a string`,
  })
  .trim()
  .min(1, `${OWNER_HEADER} must not be empty`)
  .max(100, `${OWNER_HEADER} must be at most 100 characters`);

export function ownerOf(request: Request): string {
  return validate(ownerIdSchema, request.get(OWNER_HEADER));
}
