import { existsSync } from 'node:fs';
import { TodoService } from './application/todoService.js';
import { loadConfig } from './config.js';
import { createApp } from './http/app.js';
import { JsonFileTodoRepository } from './infrastructure/jsonFileTodoRepository.js';

// Composition root: the only place where concrete implementations are wired together.
// Swapping storage - for a database, say - means changing the one line below.
const config = loadConfig();
const todoService = new TodoService(new JsonFileTodoRepository(config.dataFile));

// In development the client is served by Vite, so there is no build to serve here.
const hasClientBuild = existsSync(config.clientDir);
const app = createApp(todoService, hasClientBuild ? { clientDir: config.clientDir } : {});

const server = app.listen(config.port, () => {
  console.log(`To-do app listening on http://localhost:${config.port}`);
  console.log(`Storing to-dos in ${config.dataFile}`);
  if (!hasClientBuild) console.log('No client build found; run "npm run dev:client" for the UI.');
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
