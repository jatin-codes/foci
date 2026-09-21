import { existsSync } from 'node:fs';
import { TodoService } from './application/todoService.js';
import { loadConfig } from './config.js';
import { createApp } from './http/app.js';
import { JsonFileTodoRepository } from './infrastructure/jsonFileTodoRepository.js';

const config = loadConfig();
const todoService = new TodoService(new JsonFileTodoRepository(config.dataFile));

const hasClientBuild = existsSync(config.clientDir);
const app = createApp(todoService, {
  log: console.log,
  ...(hasClientBuild ? { clientDir: config.clientDir } : {}),
});

const server = app.listen(config.port, () => {
  console.log(`To-do app listening on http://localhost:${config.port}`);
  console.log(`Storing to-dos in ${config.dataFile}`);
  if (!hasClientBuild) console.log('No client build found; run "npm run dev:client" for the UI.');
});

const SHUTDOWN_GRACE_MS = 10_000;

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    console.log(`${signal} received; shutting down`);
    server.close(() => process.exit(0));
    // Idle keep-alive connections would otherwise hold close() open indefinitely.
    server.closeIdleConnections();
    setTimeout(() => server.closeAllConnections(), SHUTDOWN_GRACE_MS).unref();
  });
}
