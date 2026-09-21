import type { RequestHandler } from 'express';

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
