import type { z } from 'zod';

export interface ValidationIssue {
  /** Dot-separated path to the offending field; empty when the issue concerns the whole input. */
  path: string;
  message: string;
}

export class ValidationError extends Error {
  constructor(readonly issues: ValidationIssue[]) {
    super('Request validation failed');
    this.name = 'ValidationError';
  }
}

/** Parses untrusted input, returning the typed and normalised value or throwing a ValidationError. */
export function validate<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): z.output<Schema> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  throw new ValidationError(
    result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  );
}
