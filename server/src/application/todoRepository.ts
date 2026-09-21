import type { Todo, TodoChanges } from '../domain/todo.js';

/** Another owner's id must look exactly like one that does not exist. */
export interface TodoRepository {
  list(ownerId: string): Promise<Todo[]>;
  get(ownerId: string, id: string): Promise<Todo | null>;
  add(ownerId: string, todo: Todo): Promise<void>;
  update(ownerId: string, id: string, changes: TodoChanges): Promise<Todo | null>;
  remove(ownerId: string, id: string): Promise<boolean>;
}
