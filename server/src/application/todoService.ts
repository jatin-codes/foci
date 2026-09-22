import { randomUUID } from 'node:crypto';
import { toCalendarDate } from '../domain/calendarDate.js';
import { TodoNotFoundError } from '../domain/errors.js';
import {
  toView,
  type CreateTodoInput,
  type Todo,
  type TodoChanges,
  type TodoView,
} from '../domain/todo.js';
import type { TodoListQuery } from '../../../shared/contract.js';
import { queryTodos } from './todoQuery.js';
import type { TodoRepository } from './todoRepository.js';

type Clock = () => Date;
type IdGenerator = () => string;

export interface TodoPage {
  todos: TodoView[];
  total: number;
}

export class TodoService {
  constructor(
    private readonly repository: TodoRepository,
    private readonly clock: Clock = () => new Date(),
    private readonly generateId: IdGenerator = randomUUID,
  ) {}

  async create(ownerId: string, input: CreateTodoInput): Promise<TodoView> {
    const todo: Todo = {
      id: this.generateId(),
      title: input.title,
      description: input.description ?? null,
      dueDate: input.dueDate ?? null,
      isCompleted: false,
      createdAt: this.clock().toISOString(),
    };
    await this.repository.add(ownerId, todo);
    return toView(todo, this.today());
  }

  async list(ownerId: string, query: TodoListQuery = {}): Promise<TodoPage> {
    const { limit, offset = 0 } = query;
    const today = this.today();
    const matching = queryTodos(await this.repository.list(ownerId), query, today);
    const page = matching.slice(offset, limit === undefined ? undefined : offset + limit);
    return { todos: page.map((todo) => toView(todo, today)), total: matching.length };
  }

  async get(ownerId: string, id: string): Promise<TodoView> {
    const todo = await this.repository.get(ownerId, id);
    if (!todo) throw new TodoNotFoundError(id);
    return toView(todo, this.today());
  }

  async update(ownerId: string, id: string, changes: TodoChanges): Promise<TodoView> {
    const updated = await this.repository.update(ownerId, id, changes);
    if (!updated) throw new TodoNotFoundError(id);
    return toView(updated, this.today());
  }

  async delete(ownerId: string, id: string): Promise<void> {
    const removed = await this.repository.remove(ownerId, id);
    if (!removed) throw new TodoNotFoundError(id);
  }

  private today(): string {
    return toCalendarDate(this.clock());
  }
}
