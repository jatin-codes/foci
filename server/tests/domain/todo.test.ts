import { describe, expect, it } from 'vitest';
import { applyChanges, isOverdue, toView } from '../../src/domain/todo.js';
import { buildTodo } from '../support/buildTodo.js';

describe('isOverdue', () => {
  const today = '2025-06-15';

  it('is true when the due date has passed and the to-do is not completed', () => {
    expect(isOverdue(buildTodo({ dueDate: '2025-06-14' }), today)).toBe(true);
  });

  it('is false for a to-do due today', () => {
    expect(isOverdue(buildTodo({ dueDate: today }), today)).toBe(false);
  });

  it('is false for a to-do due in the future', () => {
    expect(isOverdue(buildTodo({ dueDate: '2025-06-16' }), today)).toBe(false);
  });

  it('is false once the to-do is completed, even if the due date has passed', () => {
    expect(isOverdue(buildTodo({ dueDate: '2025-06-14', isCompleted: true }), today)).toBe(false);
  });

  it('is false for a to-do without a due date', () => {
    expect(isOverdue(buildTodo({ dueDate: null }), today)).toBe(false);
  });
});

describe('applyChanges', () => {
  it('returns a new to-do and leaves the original untouched', () => {
    const original = buildTodo({ title: 'Before' });

    const changed = applyChanges(original, { title: 'After' });

    expect(changed.title).toBe('After');
    expect(original.title).toBe('Before');
  });
});

describe('toView', () => {
  it('adds whether the to-do is overdue today, keeping every stored field', () => {
    const todo = buildTodo({ dueDate: '2025-06-14' });

    expect(toView(todo, '2025-06-15')).toEqual({ ...todo, isOverdue: true });
    expect(toView(todo, '2025-06-14')).toEqual({ ...todo, isOverdue: false });
  });
});
