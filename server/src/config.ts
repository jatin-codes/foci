import path from 'node:path';

interface AppConfig {
  port: number;
  dataFile: string;
  clientDir: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`PORT must be an integer between 0 and 65535, received "${env.PORT}"`);
  }

  return {
    port,
    dataFile: path.resolve(env.DATA_FILE ?? 'data/todos.json'),
    clientDir: path.resolve(env.CLIENT_DIR ?? 'client/dist'),
  };
}
