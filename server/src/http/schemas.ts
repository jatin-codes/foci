import { z } from 'zod';
import {
  DESCRIPTION_MAX_LENGTH,
  OWNER_HEADER,
  OWNER_ID_MAX_LENGTH,
  PAGE_SIZE_MAX,
  SEARCH_MAX_LENGTH,
  SORT_FIELDS,
  SORT_ORDERS,
  STATUS_FILTERS,
  TITLE_MAX_LENGTH,
} from '../../../shared/contract.js';
import { isCalendarDate } from '../domain/calendarDate.js';

function text(field: string) {
  return z
    .string({
      error: ({ input }) =>
        input === undefined ? `${field} is required` : `${field} must be a string`,
    })
    .trim();
}

const title = text('title')
  .min(1, 'title must not be empty')
  .max(TITLE_MAX_LENGTH, `title must be at most ${TITLE_MAX_LENGTH} characters`);

const description = text('description')
  .max(DESCRIPTION_MAX_LENGTH, `description must be at most ${DESCRIPTION_MAX_LENGTH} characters`)
  .transform((value) => (value === '' ? null : value)) // a blank description means "none"
  .nullable();

const dueDate = text('dueDate')
  .refine(isCalendarDate, 'dueDate must be a valid date in YYYY-MM-DD format')
  .nullable();

// Strict objects reject unknown fields, so a typo such as "due_date" is reported, not ignored.
export const createTodoSchema = z.strictObject({
  title,
  description: description.optional(),
  dueDate: dueDate.optional(),
});

export const updateTodoSchema = z
  .strictObject({
    title: title.optional(),
    description: description.optional(),
    dueDate: dueDate.optional(),
  })
  .refine(
    (changes) => Object.keys(changes).length > 0,
    'at least one of title, description or dueDate must be provided',
  );

function oneOf<const Values extends readonly [string, ...string[]]>(param: string, values: Values) {
  return z.enum(values, { error: `${param} must be one of: ${values.join(', ')}` }).optional();
}

/** A whole number read from the query string, which only ever holds text. */
function integer(param: string, min: number, max = Number.MAX_SAFE_INTEGER) {
  const message =
    max === Number.MAX_SAFE_INTEGER
      ? `${param} must be a whole number of at least ${min}`
      : `${param} must be a whole number from ${min} to ${max}`;
  return z
    .string()
    .regex(/^\d+$/, message)
    .transform(Number)
    .pipe(z.number().int().min(min, message).max(max, message))
    .optional();
}

// Unknown query parameters are ignored, as is conventional for query strings.
export const listTodosQuerySchema = z.object({
  status: oneOf('status', STATUS_FILTERS),
  sortBy: oneOf('sortBy', SORT_FIELDS),
  order: oneOf('order', SORT_ORDERS),
  search: z
    .string()
    .trim()
    .max(SEARCH_MAX_LENGTH, `search must be at most ${SEARCH_MAX_LENGTH} characters`)
    .optional(),
  limit: integer('limit', 1, PAGE_SIZE_MAX),
  offset: integer('offset', 0),
});

/**
 * Names whose list a request is for. This scopes data; it does not protect it -
 * the id is client-supplied and checked against nothing. Real accounts would
 * derive the owner from an authenticated session instead.
 */
export const ownerIdSchema = z
  .string({
    error: ({ input }) =>
      input === undefined
        ? `${OWNER_HEADER} header is required`
        : `${OWNER_HEADER} must be a string`,
  })
  .trim()
  .min(1, `${OWNER_HEADER} must not be empty`)
  .max(OWNER_ID_MAX_LENGTH, `${OWNER_HEADER} must be at most ${OWNER_ID_MAX_LENGTH} characters`);
