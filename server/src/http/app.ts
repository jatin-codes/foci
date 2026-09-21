import express, { type Express } from 'express';
import type { TodoService } from '../application/todoService.js';
import { createTodoApiRouter } from './api/todoApiRouter.js';
import { errorHandler, notFoundHandler } from './errorHandler.js';
import { serveClient } from './serveClient.js';

interface AppOptions {
  /** Directory holding the built React app. Omitted, the app serves the API only. */
  clientDir?: string;
}

/**
 * Builds the Express app around its dependencies; it does not start listening.
 *
 * The JSON API lives under `/todos`. In production the built React app is served
 * from the same origin, so the browser needs no CORS and no separate host; in
 * development Vite serves it instead and proxies the API here.
 */
export function createApp(todoService: TodoService, options: AppOptions = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/todos', createTodoApiRouter(todoService));

  if (options.clientDir) app.use(serveClient(options.clientDir));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
