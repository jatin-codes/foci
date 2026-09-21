import { randomUUID } from 'node:crypto';
import { toCalendarDate } from '../domain/calendarDate.js';
import { TodoNotFoundError } from '../domain/errors.js';
import type { CreateTodoInput, Todo, TodoChanges, UpdateTodoInput } from '../domain/todo.js';
import { queryTodos, type TodoListQuery } from './todoQuery.js';
import type { TodoRepository } from './todoRepository.js';

type Clock = () => Date;
type IdGenerator = () => string;

/**
 * The to-do use cases. Every one acts for a single owner, which is passed in
 * rather than stored, so one service serves every caller.
 */
export class TodoService {
  constructor(
    private readonly repository: TodoRepository,
    private readonly clock: Clock = () => new Date(),
    private readonly generateId: IdGenerator = randomUUID,
  ) {}

  async create(ownerId: string, input: CreateTodoInput): Promise<Todo> {
    const todo: Todo = {
      id: this.generateId(),
      title: input.title,
      description: input.description ?? null,
      dueDate: input.dueDate ?? null,
      isCompleted: false,
      createdAt: this.clock().toISOString(),
    };
    await this.repository.add(ownerId, todo);
    return todo;
  }

  async list(ownerId: string, query: TodoListQuery = {}): Promise<Todo[]> {
    const todos = await this.repository.list(ownerId);
    return queryTodos(todos, query, toCalendarDate(this.clock()));
  }

  async get(ownerId: string, id: string): Promise<Todo> {
    const todo = await this.repository.get(ownerId, id);
    if (!todo) throw new TodoNotFoundError(id);
    return todo;
  }

  update(ownerId: string, id: string, changes: UpdateTodoInput): Promise<Todo> {
    return this.applyChanges(ownerId, id, changes);
  }

  markCompleted(ownerId: string, id: string): Promise<Todo> {
    return this.applyChanges(ownerId, id, { isCompleted: true });
  }

  markIncomplete(ownerId: string, id: string): Promise<Todo> {
    return this.applyChanges(ownerId, id, { isCompleted: false });
  }

  async delete(ownerId: string, id: string): Promise<void> {
    const removed = await this.repository.remove(ownerId, id);
    if (!removed) throw new TodoNotFoundError(id);
  }

  private async applyChanges(ownerId: string, id: string, changes: TodoChanges): Promise<Todo> {
    const updated = await this.repository.update(ownerId, id, changes);
    if (!updated) throw new TodoNotFoundError(id);
    return updated;
  }
}
