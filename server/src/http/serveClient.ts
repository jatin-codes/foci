import express, { type RequestHandler, Router } from 'express';
import path from 'node:path';

const API_PREFIXES = ['/todos', '/health'];

function isApiPath(pathname: string): boolean {
  return API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

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
