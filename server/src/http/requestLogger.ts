import type { RequestHandler } from 'express';

/**
 * Logs one line per request once its response has finished: method, path, status and
 * how long it took. The owner id is left out, so the log does not map owners to requests.
 */
export function requestLogger(log: (line: string) => void): RequestHandler {
  return (req, res, next) => {
    const started = performance.now();
    res.on('finish', () => {
      const elapsed = Math.round(performance.now() - started);
      log(`${req.method} ${req.originalUrl} ${res.statusCode} ${elapsed}ms`);
    });
    next();
  };
}
