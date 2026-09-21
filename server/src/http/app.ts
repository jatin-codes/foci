import express, { type Express } from 'express';
import type { TodoService } from '../application/todoService.js';
import { createTodoApiRouter } from './api/todoApiRouter.js';
import { errorHandler, notFoundHandler } from './errorHandler.js';
import { requestLogger } from './requestLogger.js';
import { serveClient } from './serveClient.js';

interface AppOptions {
  clientDir?: string;
  log?: (line: string) => void;
}

export function createApp(todoService: TodoService, options: AppOptions = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  if (options.log) app.use(requestLogger(options.log));
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
