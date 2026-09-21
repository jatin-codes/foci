import { beforeEach, describe, expect, it } from 'vitest';
import { TodoService } from '../../src/application/todoService.js';
import { TodoNotFoundError } from '../../src/domain/errors.js';
import { InMemoryTodoRepository } from '../../src/infrastructure/inMemoryTodoRepository.js';

const NOW = new Date('2025-06-15T10:30:00.000Z');

const OWNER = 'owner-1';

describe('TodoService', () => {
  let service: TodoService;

  beforeEach(() => {
    let nextId = 1;
    service = new TodoService(
      new InMemoryTodoRepository(),
      () => NOW,
      () => `todo-${nextId++}`,
    );
  });

  describe('create', () => {
    it('creates an incomplete to-do stamped with an id and the creation time', async () => {
      const todo = await service.create(OWNER, {
        title: 'Buy milk',
        description: 'Semi-skimmed',
        dueDate: '2025-06-20',
      });

      expect(todo).toEqual({
        id: 'todo-1',
        title: 'Buy milk',
        description: 'Semi-skimmed',
        dueDate: '2025-06-20',
        isCompleted: false,
        createdAt: '2025-06-15T10:30:00.000Z',
      });
    });

    it('defaults the optional fields to null', async () => {
      const todo = await service.create(OWNER, { title: 'Buy milk' });

      expect(todo.description).toBeNull();
      expect(todo.dueDate).toBeNull();
    });

    it('stores the to-do so it can be retrieved later', async () => {
      const created = await service.create(OWNER, { title: 'Buy milk' });

      expect(await service.get(OWNER, created.id)).toEqual(created);
    });
  });

  describe('list', () => {
    it('returns every to-do in creation order', async () => {
      await service.create(OWNER, { title: 'First' });
      await service.create(OWNER, { title: 'Second' });

      const titles = (await service.list(OWNER)).map((todo) => todo.title);

      expect(titles).toEqual(['First', 'Second']);
    });

    it('applies the requested filter and sort order', async () => {
      await service.create(OWNER, { title: 'Banana' });
      const apple = await service.create(OWNER, { title: 'Apple' });
      await service.create(OWNER, { title: 'Cherry' });
      await service.markCompleted(OWNER, apple.id);

      const todos = await service.list(OWNER, {
        status: 'incomplete',
        sortBy: 'title',
        order: 'desc',
      });

      expect(todos.map((todo) => todo.title)).toEqual(['Cherry', 'Banana']);
    });

    it('judges overdue against the current date from the clock', async () => {
      await service.create(OWNER, { title: 'Due yesterday', dueDate: '2025-06-14' });
      await service.create(OWNER, { title: 'Due today', dueDate: '2025-06-15' });

      const overdue = await service.list(OWNER, { status: 'overdue' });

      expect(overdue.map((todo) => todo.title)).toEqual(['Due yesterday']);
    });
  });

  describe('get', () => {
    it('rejects with TodoNotFoundError for an unknown id', async () => {
      await expect(service.get(OWNER, 'missing')).rejects.toThrow(TodoNotFoundError);
    });
  });

  describe('update', () => {
    it('changes only the provided fields', async () => {
      const created = await service.create(OWNER, { title: 'Buy milk', dueDate: '2025-06-20' });

      const updated = await service.update(OWNER, created.id, { title: 'Buy oat milk' });

      expect(updated).toEqual({ ...created, title: 'Buy oat milk' });
    });

    it('clears an optional field when given null', async () => {
      const created = await service.create(OWNER, { title: 'Buy milk', dueDate: '2025-06-20' });

      const updated = await service.update(OWNER, created.id, { dueDate: null });

      expect(updated.dueDate).toBeNull();
    });

    it('rejects with TodoNotFoundError for an unknown id', async () => {
      await expect(service.update(OWNER, 'missing', { title: 'Nope' })).rejects.toThrow(
        TodoNotFoundError,
      );
    });
  });

  describe('markCompleted / markIncomplete', () => {
    it('marks a to-do as completed', async () => {
      const created = await service.create(OWNER, { title: 'Buy milk' });

      const completed = await service.markCompleted(OWNER, created.id);

      expect(completed).toEqual({ ...created, isCompleted: true });
      expect((await service.get(OWNER, created.id)).isCompleted).toBe(true);
    });

    it('marks a completed to-do as incomplete again', async () => {
      const created = await service.create(OWNER, { title: 'Buy milk' });
      await service.markCompleted(OWNER, created.id);

      const reopened = await service.markIncomplete(OWNER, created.id);

      expect(reopened.isCompleted).toBe(false);
    });

    it('is idempotent', async () => {
      const created = await service.create(OWNER, { title: 'Buy milk' });

      await service.markCompleted(OWNER, created.id);
      const completedAgain = await service.markCompleted(OWNER, created.id);

      expect(completedAgain.isCompleted).toBe(true);
    });

    it('rejects with TodoNotFoundError for an unknown id', async () => {
      await expect(service.markCompleted(OWNER, 'missing')).rejects.toThrow(TodoNotFoundError);
      await expect(service.markIncomplete(OWNER, 'missing')).rejects.toThrow(TodoNotFoundError);
    });
  });

  describe('delete', () => {
    it('removes the to-do', async () => {
      const created = await service.create(OWNER, { title: 'Buy milk' });

      await service.delete(OWNER, created.id);

      await expect(service.get(OWNER, created.id)).rejects.toThrow(TodoNotFoundError);
      expect(await service.list(OWNER)).toEqual([]);
    });

    it('rejects with TodoNotFoundError for an unknown id', async () => {
      await expect(service.delete(OWNER, 'missing')).rejects.toThrow(TodoNotFoundError);
    });
  });
});
