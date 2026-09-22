import { beforeEach, describe, expect, it } from 'vitest';
import { TodoService } from '../../src/application/todoService.js';
import { TodoNotFoundError } from '../../src/domain/errors.js';
import { InMemoryTodoRepository } from '../support/inMemoryTodoRepository.js';

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
        isOverdue: false,
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

      const titles = (await service.list(OWNER)).todos.map((todo) => todo.title);

      expect(titles).toEqual(['First', 'Second']);
    });

    it('applies the requested filter and sort order', async () => {
      await service.create(OWNER, { title: 'Banana' });
      const apple = await service.create(OWNER, { title: 'Apple' });
      await service.create(OWNER, { title: 'Cherry' });
      await service.update(OWNER, apple.id, { isCompleted: true });

      const { todos } = await service.list(OWNER, {
        isCompleted: false,
        sortBy: 'title',
        order: 'desc',
      });

      expect(todos.map((todo) => todo.title)).toEqual(['Cherry', 'Banana']);
    });

    it('judges overdue against the current date from the clock', async () => {
      await service.create(OWNER, { title: 'Due yesterday', dueDate: '2025-06-14' });
      await service.create(OWNER, { title: 'Due today', dueDate: '2025-06-15' });

      const { todos: overdue } = await service.list(OWNER, { overdue: true });

      expect(overdue.map((todo) => todo.title)).toEqual(['Due yesterday']);
    });

    it('reports on every to-do whether it is overdue', async () => {
      await service.create(OWNER, { title: 'Due yesterday', dueDate: '2025-06-14' });
      await service.create(OWNER, { title: 'Due today', dueDate: '2025-06-15' });

      const { todos } = await service.list(OWNER);

      expect(todos.map((todo) => todo.isOverdue)).toEqual([true, false]);
    });

    it('returns one page of the matches, with how many matched in all', async () => {
      for (const title of ['A', 'B', 'C', 'D', 'E']) await service.create(OWNER, { title });

      const page = await service.list(OWNER, { sortBy: 'title', limit: 2, offset: 1 });

      expect(page.todos.map((todo) => todo.title)).toEqual(['B', 'C']);
      expect(page.total).toBe(5);
    });

    it('pages after filtering, so the total counts matches rather than every to-do', async () => {
      await service.create(OWNER, { title: 'Late', dueDate: '2025-06-01' });
      await service.create(OWNER, { title: 'Undated' });

      const page = await service.list(OWNER, { overdue: true, limit: 10 });

      expect(page.todos.map((todo) => todo.title)).toEqual(['Late']);
      expect(page.total).toBe(1);
    });

    it('returns an empty page past the end', async () => {
      await service.create(OWNER, { title: 'Only' });

      expect(await service.list(OWNER, { offset: 5 })).toEqual({ todos: [], total: 1 });
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

  describe('completing', () => {
    it('marks a to-do as completed', async () => {
      const created = await service.create(OWNER, { title: 'Buy milk' });

      const completed = await service.update(OWNER, created.id, { isCompleted: true });

      expect(completed).toEqual({ ...created, isCompleted: true });
      expect((await service.get(OWNER, created.id)).isCompleted).toBe(true);
    });

    it('marks a completed to-do as incomplete again', async () => {
      const created = await service.create(OWNER, { title: 'Buy milk' });
      await service.update(OWNER, created.id, { isCompleted: true });

      const reopened = await service.update(OWNER, created.id, { isCompleted: false });

      expect(reopened.isCompleted).toBe(false);
    });

    it('stops a to-do being overdue once it is completed', async () => {
      const created = await service.create(OWNER, { title: 'Late', dueDate: '2025-06-01' });
      expect(created.isOverdue).toBe(true);

      const completed = await service.update(OWNER, created.id, { isCompleted: true });

      expect(completed.isOverdue).toBe(false);
    });

    it('is idempotent', async () => {
      const created = await service.create(OWNER, { title: 'Buy milk' });

      await service.update(OWNER, created.id, { isCompleted: true });
      const completedAgain = await service.update(OWNER, created.id, { isCompleted: true });

      expect(completedAgain.isCompleted).toBe(true);
    });
  });

  describe('delete', () => {
    it('removes the to-do', async () => {
      const created = await service.create(OWNER, { title: 'Buy milk' });

      await service.delete(OWNER, created.id);

      await expect(service.get(OWNER, created.id)).rejects.toThrow(TodoNotFoundError);
      expect(await service.list(OWNER)).toEqual({ todos: [], total: 0 });
    });

    it('rejects with TodoNotFoundError for an unknown id', async () => {
      await expect(service.delete(OWNER, 'missing')).rejects.toThrow(TodoNotFoundError);
    });
  });
});
