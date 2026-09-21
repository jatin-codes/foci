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
  .transform((value) => (value === '' ? null : value))
  .nullable();

const dueDate = text('dueDate')
  .refine(isCalendarDate, 'dueDate must be a valid date in YYYY-MM-DD format')
  .nullable();

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

function integer(param: string, min: number, max?: number) {
  const message =
    max === undefined
      ? `${param} must be a whole number of at least ${min}`
      : `${param} must be a whole number from ${min} to ${max}`;
  const number = z.number().min(min, message);
  return z
    .string()
    .regex(/^\d+$/, message)
    .transform(Number)
    .pipe(max === undefined ? number : number.max(max, message))
    .optional();
}

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

/** Scopes data but does not protect it: the id is client-supplied and checked against nothing. */
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
