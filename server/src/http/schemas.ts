import { z } from 'zod';
import { SORT_FIELDS, SORT_ORDERS, STATUS_FILTERS } from '../application/todoQuery.js';
import { isCalendarDate } from '../domain/calendarDate.js';

const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 2000;
const SEARCH_MAX_LENGTH = 200;

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
});

export const OWNER_HEADER = 'X-Owner-Id';

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
  .max(100, `${OWNER_HEADER} must be at most 100 characters`);
