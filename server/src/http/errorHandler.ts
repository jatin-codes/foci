import type { ErrorRequestHandler, RequestHandler } from 'express';
import { TodoNotFoundError } from '../domain/errors.js';
import { ValidationError } from './validation.js';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

function errorBody(code: string, message: string, details?: unknown): ErrorBody {
  return { error: { code, message, ...(details === undefined ? {} : { details }) } };
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(errorBody('ROUTE_NOT_FOUND', `Cannot ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ValidationError) {
    res.status(400).json(errorBody('VALIDATION_ERROR', error.message, error.issues));
    return;
  }

  if (error instanceof TodoNotFoundError) {
    res.status(404).json(errorBody('TODO_NOT_FOUND', error.message));
    return;
  }

  if (isClientHttpError(error)) {
    const isMalformedJson = error.type === 'entity.parse.failed';
    res
      .status(error.status)
      .json(
        isMalformedJson
          ? errorBody('INVALID_JSON', 'Request body is not valid JSON')
          : errorBody('BAD_REQUEST', error.message),
      );
    return;
  }

  console.error(error);
  res.status(500).json(errorBody('INTERNAL_ERROR', 'An unexpected error occurred'));
};

function isClientHttpError(error: unknown): error is Error & { status: number; type?: string } {
  return (
    error instanceof Error &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500
  );
}
