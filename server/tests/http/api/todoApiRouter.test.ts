import type { Express } from 'express';
import supertest from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TodoService } from '../../../src/application/todoService.js';
import { createApp } from '../../../src/http/app.js';
import { OWNER_HEADER } from '../../../src/http/owner.js';
import { InMemoryTodoRepository } from '../../../src/infrastructure/inMemoryTodoRepository.js';

const NOW = new Date('2025-06-15T10:30:00.000Z');

describe('To-do API', () => {
  let app: Express;
  // Every request needs an owner, so the tests speak through an agent that
  // sends one; requests that omit it are exercised on purpose below.
  let request: ReturnType<typeof agentFor>;

  function agentFor(target: Express, ownerId: string) {
    const agent = supertest.agent(target);
    agent.set(OWNER_HEADER, ownerId);
    return agent;
  }

  beforeEach(() => {
    app = createApp(new TodoService(new InMemoryTodoRepository(), () => NOW));
    request = agentFor(app, 'owner-1');
  });

  async function createTodo(body: Record<string, unknown> = { title: 'Buy milk' }) {
    const response = await request.post('/todos').send(body).expect(201);
    return response.body;
  }

  describe('POST /todos', () => {
    it('creates a to-do and returns it with its location', async () => {
      const response = await request
        .post('/todos')
        .send({ title: 'Buy milk', description: 'Semi-skimmed', dueDate: '2025-06-20' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: expect.any(String),
        title: 'Buy milk',
        description: 'Semi-skimmed',
        dueDate: '2025-06-20',
        isCompleted: false,
        createdAt: '2025-06-15T10:30:00.000Z',
      });
      expect(response.headers.location).toBe(`/todos/${response.body.id}`);
    });

    it('requires only a title', async () => {
      const todo = await createTodo({ title: 'Buy milk' });

      expect(todo).toMatchObject({ description: null, dueDate: null, isCompleted: false });
    });

    it('trims surrounding whitespace and treats a blank description as none', async () => {
      const todo = await createTodo({ title: '  Buy milk  ', description: '   ' });

      expect(todo).toMatchObject({ title: 'Buy milk', description: null });
    });

    it.each([
      ['a missing title', {}, 'title', 'title is required'],
      ['a blank title', { title: '   ' }, 'title', 'title must not be empty'],
      ['a non-string title', { title: 42 }, 'title', 'title must be a string'],
      [
        'an overly long title',
        { title: 'x'.repeat(201) },
        'title',
        'title must be at most 200 characters',
      ],
      [
        'a malformed due date',
        { title: 'Buy milk', dueDate: '20/06/2025' },
        'dueDate',
        'dueDate must be a valid date in YYYY-MM-DD format',
      ],
      [
        'a due date that does not exist',
        { title: 'Buy milk', dueDate: '2025-02-30' },
        'dueDate',
        'dueDate must be a valid date in YYYY-MM-DD format',
      ],
    ])('rejects %s with 400', async (_case, body, path, message) => {
      const response = await request.post('/todos').send(body);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContainEqual({ path, message });
    });

    it('rejects unknown fields, so completion cannot be set on creation', async () => {
      const response = await request.post('/todos').send({ title: 'Buy milk', isCompleted: true });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a body that is not valid JSON with 400', async () => {
      const response = await request
        .post('/todos')
        .set('Content-Type', 'application/json')
        .send('{ "title": ');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_JSON');
    });

    it('rejects a missing body with 400', async () => {
      const response = await request.post('/todos');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /todos', () => {
    it('returns an empty list when there are no to-dos', async () => {
      const response = await request.get('/todos');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('returns all to-dos in creation order', async () => {
      const first = await createTodo({ title: 'First' });
      const second = await createTodo({ title: 'Second' });

      const response = await request.get('/todos');

      expect(response.body).toEqual([first, second]);
    });

    it('filters by status', async () => {
      const done = await createTodo({ title: 'Done' });
      await createTodo({ title: 'Pending' });
      await request.post(`/todos/${done.id}/complete`);

      const completed = await request.get('/todos?status=completed');
      const incomplete = await request.get('/todos?status=incomplete');

      expect(completed.body.map((todo: { title: string }) => todo.title)).toEqual(['Done']);
      expect(incomplete.body.map((todo: { title: string }) => todo.title)).toEqual(['Pending']);
    });

    it('returns overdue to-dos: incomplete with a due date before today', async () => {
      await createTodo({ title: 'Late', dueDate: '2025-06-14' });
      await createTodo({ title: 'Due today', dueDate: '2025-06-15' });
      const lateButDone = await createTodo({ title: 'Late but done', dueDate: '2025-06-01' });
      await request.post(`/todos/${lateButDone.id}/complete`);

      const response = await request.get('/todos?status=overdue');

      expect(response.body.map((todo: { title: string }) => todo.title)).toEqual(['Late']);
    });

    it('sorts by the requested field and order', async () => {
      await createTodo({ title: 'Later', dueDate: '2025-07-01' });
      await createTodo({ title: 'Undated' });
      await createTodo({ title: 'Sooner', dueDate: '2025-06-20' });

      const response = await request.get('/todos?sortBy=dueDate&order=desc');

      expect(response.body.map((todo: { title: string }) => todo.title)).toEqual([
        'Later',
        'Sooner',
        'Undated',
      ]);
    });

    it('searches title and description', async () => {
      await createTodo({ title: 'Buy milk', description: 'Semi-skimmed' });
      await createTodo({ title: 'Write README', description: 'Cover the milk run' });
      await createTodo({ title: 'Unrelated' });

      const response = await request.get('/todos?search=milk');

      expect(response.status).toBe(200);
      expect(response.body.map((todo: { title: string }) => todo.title)).toEqual([
        'Buy milk',
        'Write README',
      ]);
    });

    it('combines search with a status filter', async () => {
      const done = await createTodo({ title: 'Buy milk' });
      await request.post(`/todos/${done.id}/complete`).expect(200);
      await createTodo({ title: 'Buy bread' });

      const response = await request.get('/todos?search=buy&status=incomplete');

      expect(response.body.map((todo: { title: string }) => todo.title)).toEqual(['Buy bread']);
    });

    it.each([
      ['status=done', 'status', 'status must be one of: all, completed, incomplete, overdue'],
      ['sortBy=priority', 'sortBy', 'sortBy must be one of: createdAt, dueDate, title'],
      ['order=up', 'order', 'order must be one of: asc, desc'],
      [`search=${'x'.repeat(201)}`, 'search', 'search must be at most 200 characters'],
    ])('rejects ?%s with 400', async (queryString, path, message) => {
      const response = await request.get(`/todos?${queryString}`);

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual([{ path, message }]);
    });
  });

  describe('GET /todos/:id', () => {
    it('returns the to-do', async () => {
      const todo = await createTodo();

      const response = await request.get(`/todos/${todo.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(todo);
    });

    it('returns 404 for an unknown id', async () => {
      const response = await request.get('/todos/missing');

      expect(response.status).toBe(404);
      expect(response.body.error).toEqual({
        code: 'TODO_NOT_FOUND',
        message: 'To-do with id "missing" was not found',
      });
    });
  });

  describe('PATCH /todos/:id', () => {
    it('updates only the provided fields', async () => {
      const todo = await createTodo({ title: 'Buy milk', dueDate: '2025-06-20' });

      const response = await request
        .patch(`/todos/${todo.id}`)
        .send({ title: 'Buy oat milk', description: 'From the corner shop' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ...todo,
        title: 'Buy oat milk',
        description: 'From the corner shop',
      });
    });

    it('clears an optional field when given null', async () => {
      const todo = await createTodo({ title: 'Buy milk', dueDate: '2025-06-20' });

      const response = await request.patch(`/todos/${todo.id}`).send({ dueDate: null });

      expect(response.body.dueDate).toBeNull();
    });

    it('persists the update', async () => {
      const todo = await createTodo();
      await request.patch(`/todos/${todo.id}`).send({ title: 'Buy oat milk' });

      const response = await request.get(`/todos/${todo.id}`);

      expect(response.body.title).toBe('Buy oat milk');
    });

    it.each([
      ['an empty body', {}],
      ['a blank title', { title: '' }],
      ['a null title', { title: null }],
      ['an invalid due date', { dueDate: 'soon' }],
      ['the completion flag, which has dedicated endpoints', { isCompleted: true }],
      ['read-only fields', { createdAt: '2020-01-01T00:00:00.000Z' }],
    ])('rejects %s with 400', async (_case, body) => {
      const todo = await createTodo();

      const response = await request.patch(`/todos/${todo.id}`).send(body);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 for an unknown id', async () => {
      const response = await request.patch('/todos/missing').send({ title: 'Nope' });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /todos/:id/complete and /incomplete', () => {
    it('marks a to-do as completed', async () => {
      const todo = await createTodo();

      const response = await request.post(`/todos/${todo.id}/complete`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ...todo, isCompleted: true });
    });

    it('marks a completed to-do as incomplete', async () => {
      const todo = await createTodo();
      await request.post(`/todos/${todo.id}/complete`);

      const response = await request.post(`/todos/${todo.id}/incomplete`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ...todo, isCompleted: false });
    });

    it('is idempotent', async () => {
      const todo = await createTodo();
      await request.post(`/todos/${todo.id}/complete`);

      const response = await request.post(`/todos/${todo.id}/complete`);

      expect(response.status).toBe(200);
      expect(response.body.isCompleted).toBe(true);
    });

    it('returns 404 for an unknown id', async () => {
      expect((await request.post('/todos/missing/complete')).status).toBe(404);
      expect((await request.post('/todos/missing/incomplete')).status).toBe(404);
    });
  });

  describe('DELETE /todos/:id', () => {
    it('deletes the to-do', async () => {
      const todo = await createTodo();

      const response = await request.delete(`/todos/${todo.id}`);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
      expect((await request.get(`/todos/${todo.id}`)).status).toBe(404);
    });

    it('returns 404 for an unknown id', async () => {
      const response = await request.delete('/todos/missing');

      expect(response.status).toBe(404);
    });
  });

  describe('owners', () => {
    it('rejects a request that names no owner', async () => {
      const anonymous = supertest.agent(app);

      const response = await anonymous.get('/todos');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details[0].message).toMatch(/X-Owner-Id header is required/);
    });

    it('rejects a blank owner', async () => {
      const blank = agentFor(app, '   ');

      expect((await blank.get('/todos')).status).toBe(400);
    });

    it('shows each owner only their own to-dos', async () => {
      const other = agentFor(app, 'owner-2');
      await createTodo({ title: 'Mine' });
      await other.post('/todos').send({ title: 'Theirs' }).expect(201);

      expect((await request.get('/todos')).body.map((t: { title: string }) => t.title)).toEqual([
        'Mine',
      ]);
      expect((await other.get('/todos')).body.map((t: { title: string }) => t.title)).toEqual([
        'Theirs',
      ]);
    });

    it("answers 404 for another owner's to-do rather than revealing it", async () => {
      const mine = await createTodo({ title: 'Mine' });
      const other = agentFor(app, 'owner-2');

      const response = await other.get(`/todos/${mine.id}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TODO_NOT_FOUND');
    });

    it("refuses to change or delete another owner's to-do", async () => {
      const mine = await createTodo({ title: 'Mine' });
      const other = agentFor(app, 'owner-2');

      await other.patch(`/todos/${mine.id}`).send({ title: 'Hijacked' }).expect(404);
      await other.post(`/todos/${mine.id}/complete`).expect(404);
      await other.delete(`/todos/${mine.id}`).expect(404);

      const unchanged = await request.get(`/todos/${mine.id}`);
      expect(unchanged.body).toEqual(mine);
    });
  });

  describe('error handling', () => {
    it('returns a JSON 404 for unknown routes', async () => {
      const response = await request.get('/nope');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
    });

    it('returns 500 without leaking details when something unexpected fails', async () => {
      const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
      const failure = new Error('disk on fire');
      const repository = new InMemoryTodoRepository();
      vi.spyOn(repository, 'list').mockRejectedValue(failure);

      const failing = agentFor(createApp(new TodoService(repository)), 'owner-1');

      const response = await failing.get('/todos');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      });
      expect(logged).toHaveBeenCalledWith(failure);
      logged.mockRestore();
    });
  });

  describe('GET /health', () => {
    it('reports that the service is up', async () => {
      const response = await request.get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });
});
