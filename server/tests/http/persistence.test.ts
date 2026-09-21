import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import supertest from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TodoService } from '../../src/application/todoService.js';
import { createApp } from '../../src/http/app.js';
import { OWNER_HEADER } from '../../src/http/schemas.js';
import { JsonFileTodoRepository } from '../../src/infrastructure/jsonFileTodoRepository.js';

/** End-to-end check of the production wiring: HTTP -> service -> JSON file. */
describe('To-do API with file persistence', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'todo-api-e2e-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  /** A client for one owner, against a freshly started app over the same data file. */
  function startApp(ownerId = 'owner-1') {
    const repository = new JsonFileTodoRepository(path.join(directory, 'todos.json'));
    const agent = supertest.agent(createApp(new TodoService(repository)));
    agent.set(OWNER_HEADER, ownerId);
    return agent;
  }

  it('serves previously saved to-dos after a restart', async () => {
    const firstRun = startApp();
    const created = await firstRun.post('/todos').send({ title: 'Buy milk' }).expect(201);
    await firstRun.post(`/todos/${created.body.id}/complete`).expect(200);

    const secondRun = startApp();
    const response = await secondRun.get('/todos').expect(200);

    expect(response.body).toEqual([{ ...created.body, isCompleted: true }]);
  });
});
