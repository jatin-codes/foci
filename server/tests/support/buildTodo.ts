import type { Todo } from '../../src/domain/todo.js';

export function buildTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'todo-1',
    title: 'Buy milk',
    description: null,
    dueDate: null,
    isCompleted: false,
    createdAt: '2025-01-01T09:00:00.000Z',
    ...overrides,
  };
}
