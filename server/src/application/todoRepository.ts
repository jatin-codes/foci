import type { Todo, TodoChanges } from '../domain/todo.js';

/**
 * Storage for to-dos, scoped by owner.
 *
 * Every method takes the owner it acts for, and an implementation must never let
 * one owner read or write another's to-dos: an id from a different owner has to
 * look exactly like an id that does not exist. The contract suite enforces that.
 */
export interface TodoRepository {
  list(ownerId: string): Promise<Todo[]>;
  get(ownerId: string, id: string): Promise<Todo | null>;
  add(ownerId: string, todo: Todo): Promise<void>;
  update(ownerId: string, id: string, changes: TodoChanges): Promise<Todo | null>;
  remove(ownerId: string, id: string): Promise<boolean>;
}
