import type { TodoRepository } from '../../src/application/todoRepository.js';
import { applyChanges, type Todo, type TodoChanges } from '../../src/domain/todo.js';

export class InMemoryTodoRepository implements TodoRepository {
  private readonly byOwner = new Map<string, Map<string, Todo>>();

  private todosFor(ownerId: string): Map<string, Todo> {
    const existing = this.byOwner.get(ownerId);
    if (existing) return existing;

    const created = new Map<string, Todo>();
    this.byOwner.set(ownerId, created);
    return created;
  }

  async list(ownerId: string): Promise<Todo[]> {
    return [...this.todosFor(ownerId).values()];
  }

  async get(ownerId: string, id: string): Promise<Todo | null> {
    return this.todosFor(ownerId).get(id) ?? null;
  }

  async add(ownerId: string, todo: Todo): Promise<void> {
    this.todosFor(ownerId).set(todo.id, todo);
  }

  async update(ownerId: string, id: string, changes: TodoChanges): Promise<Todo | null> {
    const todos = this.todosFor(ownerId);
    const existing = todos.get(id);
    if (!existing) return null;

    const updated = applyChanges(existing, changes);
    todos.set(id, updated);
    return updated;
  }

  async remove(ownerId: string, id: string): Promise<boolean> {
    return this.todosFor(ownerId).delete(id);
  }
}
