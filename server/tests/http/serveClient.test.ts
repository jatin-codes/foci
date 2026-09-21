import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import supertest from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TodoService } from '../../src/application/todoService.js';
import { createApp } from '../../src/http/app.js';
import { InMemoryTodoRepository } from '../support/inMemoryTodoRepository.js';

const INDEX_HTML = '<!doctype html><div id="root"></div>';

describe('serving the client', () => {
  let clientDir: string;
  let request: ReturnType<typeof supertest>;

  beforeEach(async () => {
    clientDir = await mkdtemp(path.join(tmpdir(), 'todo-client-'));
    await mkdir(path.join(clientDir, 'assets'));
    await writeFile(path.join(clientDir, 'index.html'), INDEX_HTML);
    await writeFile(path.join(clientDir, 'assets', 'app.js'), 'console.log("app");');

    const service = new TodoService(new InMemoryTodoRepository());
    request = supertest(createApp(service, { clientDir }));
  });

  afterEach(async () => {
    await rm(clientDir, { recursive: true, force: true });
  });

  it('serves the app at the root', async () => {
    const response = await request.get('/').expect(200);

    expect(response.type).toBe('text/html');
    expect(response.text).toBe(INDEX_HTML);
  });

  it('serves built assets', async () => {
    const response = await request.get('/assets/app.js').expect(200);

    expect(response.type).toMatch(/javascript/);
    expect(response.text).toBe('console.log("app");');
  });

  it('answers any other page with the app, so client-side routes survive a refresh', async () => {
    const response = await request.get('/some/page').expect(200);

    expect(response.text).toBe(INDEX_HTML);
  });

  it.each(['/todos/a/b', '/health/extra'])(
    'answers an unknown API path %s with a JSON 404, not the app',
    async (apiPath) => {
      const response = await request.get(apiPath).expect(404);

      expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
    },
  );

  it('does not answer non-GET requests with the app', async () => {
    const response = await request.post('/some/page').expect(404);

    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('still serves the API', async () => {
    await request.get('/health').expect(200, { status: 'ok' });
  });
});
