import type { z } from 'zod';

interface ValidationIssue {
  path: string;
  message: string;
}

export class ValidationError extends Error {
  constructor(readonly issues: ValidationIssue[]) {
    super('Request validation failed');
    this.name = 'ValidationError';
  }
}

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
