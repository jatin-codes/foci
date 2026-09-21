import express, { type RequestHandler, Router } from 'express';
import path from 'node:path';

/** Paths the API owns; the client build must never answer for them. */
const API_PREFIXES = ['/todos', '/health'];

function isApiPath(pathname: string): boolean {
  return API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Serves the built React app: its assets, and `index.html` for any other page so
 * client-side routes survive a refresh. Unknown API paths fall through to the
 * error handler, so a typo in a request still gets a JSON 404 rather than HTML.
 */
export function serveClient(clientDir: string): RequestHandler {
  const router = Router();
  const indexFile = path.join(clientDir, 'index.html');

  router.use(express.static(clientDir, { index: false }));

  router.use((req, res, next) => {
    if (req.method !== 'GET' || isApiPath(req.path)) return next();
    res.sendFile(indexFile, (error) => {
      if (error) next(error);
    });
  });

  return router;
}
