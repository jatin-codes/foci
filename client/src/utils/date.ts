import type { Todo } from '../api/types.js';

export function isOverdue(todo: Todo, today: string): boolean {
  return !todo.isCompleted && todo.dueDate !== null && todo.dueDate < today;
}

export function todayAsCalendarDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
