import { describe, expect, it } from 'vitest';
import { queryTodos } from '../../src/application/todoQuery.js';
import { buildTodo } from '../support/buildTodo.js';

const TODAY = '2025-06-15';

const titles = (todos: { title: string }[]) => todos.map((todo) => todo.title);

describe('queryTodos', () => {
  describe('filtering', () => {
    const todos = [
      buildTodo({ title: 'done', isCompleted: true, dueDate: '2025-06-01' }),
      buildTodo({ title: 'late', dueDate: '2025-06-14' }),
      buildTodo({ title: 'due today', dueDate: TODAY }),
      buildTodo({ title: 'someday' }),
    ];

    it('returns everything by default', () => {
      expect(titles(queryTodos(todos, {}, TODAY))).toEqual([
        'done',
        'late',
        'due today',
        'someday',
      ]);
    });

    it('returns only completed to-dos', () => {
      expect(titles(queryTodos(todos, { isCompleted: true }, TODAY))).toEqual(['done']);
    });

    it('returns only incomplete to-dos', () => {
      expect(titles(queryTodos(todos, { isCompleted: false }, TODAY))).toEqual([
        'late',
        'due today',
        'someday',
      ]);
    });

    it('returns only incomplete to-dos whose due date has passed as overdue', () => {
      expect(titles(queryTodos(todos, { overdue: true }, TODAY))).toEqual(['late']);
    });

    it('returns everything else when overdue is false', () => {
      expect(titles(queryTodos(todos, { overdue: false }, TODAY))).toEqual([
        'done',
        'due today',
        'someday',
      ]);
    });

    it('applies both filters together', () => {
      expect(titles(queryTodos(todos, { isCompleted: false, overdue: false }, TODAY))).toEqual([
        'due today',
        'someday',
      ]);
      expect(queryTodos(todos, { isCompleted: true, overdue: true }, TODAY)).toEqual([]);
    });
  });

  describe('sorting', () => {
    it('sorts by creation time, oldest first, by default', () => {
      const todos = [
        buildTodo({ title: 'newer', createdAt: '2025-06-02T00:00:00.000Z' }),
        buildTodo({ title: 'older', createdAt: '2025-06-01T00:00:00.000Z' }),
      ];

      expect(titles(queryTodos(todos, {}, TODAY))).toEqual(['older', 'newer']);
    });

    it('sorts by creation time, newest first', () => {
      const todos = [
        buildTodo({ title: 'older', createdAt: '2025-06-01T00:00:00.000Z' }),
        buildTodo({ title: 'newer', createdAt: '2025-06-02T00:00:00.000Z' }),
      ];

      expect(titles(queryTodos(todos, { sortBy: 'createdAt', order: 'desc' }, TODAY))).toEqual([
        'newer',
        'older',
      ]);
    });

    it('sorts by title, ignoring case', () => {
      const todos = [
        buildTodo({ title: 'banana' }),
        buildTodo({ title: 'Cherry' }),
        buildTodo({ title: 'apple' }),
      ];

      expect(titles(queryTodos(todos, { sortBy: 'title' }, TODAY))).toEqual([
        'apple',
        'banana',
        'Cherry',
      ]);
    });

    it('sorts titles as people read them: accents ignored, numbers by value', () => {
      const todos = [
        buildTodo({ title: 'Task 10' }),
        buildTodo({ title: 'fig' }),
        buildTodo({ title: 'Task 2' }),
        buildTodo({ title: 'Éclair' }),
        buildTodo({ title: 'apple' }),
      ];

      expect(titles(queryTodos(todos, { sortBy: 'title' }, TODAY))).toEqual([
        'apple',
        'Éclair',
        'fig',
        'Task 2',
        'Task 10',
      ]);
    });

    const withDueDates = [
      buildTodo({ title: 'no date' }),
      buildTodo({ title: 'later', dueDate: '2025-07-01' }),
      buildTodo({ title: 'sooner', dueDate: '2025-06-20' }),
    ];

    it('sorts by due date with undated to-dos last', () => {
      expect(titles(queryTodos(withDueDates, { sortBy: 'dueDate' }, TODAY))).toEqual([
        'sooner',
        'later',
        'no date',
      ]);
    });

    it('keeps undated to-dos last when the order is descending', () => {
      expect(titles(queryTodos(withDueDates, { sortBy: 'dueDate', order: 'desc' }, TODAY))).toEqual(
        ['later', 'sooner', 'no date'],
      );
    });

    it('keeps the original order of to-dos that compare equal', () => {
      const todos = [
        buildTodo({ title: 'first', dueDate: '2025-06-20' }),
        buildTodo({ title: 'second', dueDate: '2025-06-20' }),
      ];

      expect(titles(queryTodos(todos, { sortBy: 'dueDate', order: 'desc' }, TODAY))).toEqual([
        'first',
        'second',
      ]);
    });
  });

  describe('search', () => {
    it('matches the title, ignoring case', () => {
      const todos = [buildTodo({ title: 'Buy milk' }), buildTodo({ title: 'Write README' })];

      expect(titles(queryTodos(todos, { search: 'MILK' }, TODAY))).toEqual(['Buy milk']);
    });

    it('matches the description too', () => {
      const todos = [
        buildTodo({ title: 'Groceries', description: 'Semi-skimmed milk' }),
        buildTodo({ title: 'Write README' }),
      ];

      expect(titles(queryTodos(todos, { search: 'milk' }, TODAY))).toEqual(['Groceries']);
    });

    it('matches part of a word', () => {
      const todos = [buildTodo({ title: 'Refactoring' })];

      expect(titles(queryTodos(todos, { search: 'factor' }, TODAY))).toEqual(['Refactoring']);
    });

    it('returns nothing when there is no match', () => {
      const todos = [buildTodo({ title: 'Buy milk' })];

      expect(queryTodos(todos, { search: 'bicycle' }, TODAY)).toEqual([]);
    });

    it('treats blank search as no search', () => {
      const todos = [buildTodo({ title: 'a' }), buildTodo({ title: 'b' })];

      expect(titles(queryTodos(todos, { search: '   ' }, TODAY))).toEqual(['a', 'b']);
    });

    it('ignores a to-do with no description rather than failing', () => {
      const todos = [buildTodo({ title: 'Buy milk', description: null })];

      expect(queryTodos(todos, { search: 'semi' }, TODAY)).toEqual([]);
    });

    it('narrows the status filter rather than replacing it', () => {
      const todos = [
        buildTodo({ title: 'Buy milk', isCompleted: true }),
        buildTodo({ title: 'Buy bread' }),
      ];

      expect(titles(queryTodos(todos, { search: 'buy', isCompleted: false }, TODAY))).toEqual([
        'Buy bread',
      ]);
    });
  });

  it('combines filtering and sorting', () => {
    const todos = [
      buildTodo({ title: 'b', dueDate: '2025-06-10' }),
      buildTodo({ title: 'done', dueDate: '2025-06-01', isCompleted: true }),
      buildTodo({ title: 'a', dueDate: '2025-06-05' }),
    ];

    expect(titles(queryTodos(todos, { overdue: true, sortBy: 'dueDate' }, TODAY))).toEqual([
      'a',
      'b',
    ]);
  });

  it('does not mutate the input', () => {
    const todos = [buildTodo({ title: 'b' }), buildTodo({ title: 'a' })];

    queryTodos(todos, { sortBy: 'title' }, TODAY);

    expect(titles(todos)).toEqual(['b', 'a']);
  });
});
