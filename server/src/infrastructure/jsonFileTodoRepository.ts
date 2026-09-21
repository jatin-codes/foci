import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { TodoRepository } from '../application/todoRepository.js';
import { applyChanges, type Todo, type TodoChanges } from '../domain/todo.js';

/** How a to-do is stored: the to-do itself plus the owner it belongs to. */
interface StoredTodo extends Todo {
  ownerId: string;
}

function withoutOwner({ ownerId: _ownerId, ...todo }: StoredTodo): Todo {
  return todo;
}

export class DataFileCorruptedError extends Error {
  constructor(filePath: string, options?: ErrorOptions) {
    super(`Data file "${filePath}" does not contain a valid list of to-dos`, options);
    this.name = 'DataFileCorruptedError';
  }
}

/**
 * Stores every owner's to-dos as one JSON array in a single file, each record
 * carrying the owner it belongs to. Reads and writes are scoped by owner, so one
 * owner's id can never reach another's data.
 *
 * Every operation reads the file afresh, so the file is the single source of
 * truth. Operations are queued to run one at a time, which keeps each
 * read-modify-write cycle atomic within this process, and writes go through a
 * temporary file so a crash mid-write cannot leave a truncated data file.
 */
export class JsonFileTodoRepository implements TodoRepository {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  list(ownerId: string): Promise<Todo[]> {
    return this.enqueue(async () => this.owned(await this.read(), ownerId).map(withoutOwner));
  }

  get(ownerId: string, id: string): Promise<Todo | null> {
    return this.enqueue(async () => {
      const found = this.find(await this.read(), ownerId, id);
      return found ? withoutOwner(found) : null;
    });
  }

  add(ownerId: string, todo: Todo): Promise<void> {
    return this.enqueue(async () => {
      const todos = await this.read();
      await this.write([...todos, { ...todo, ownerId }]);
    });
  }

  update(ownerId: string, id: string, changes: TodoChanges): Promise<Todo | null> {
    return this.enqueue(async () => {
      const todos = await this.read();
      const existing = this.find(todos, ownerId, id);
      if (!existing) return null;

      const updated: StoredTodo = { ...applyChanges(existing, changes), ownerId };
      await this.write(todos.map((todo) => (todo === existing ? updated : todo)));
      return withoutOwner(updated);
    });
  }

  remove(ownerId: string, id: string): Promise<boolean> {
    return this.enqueue(async () => {
      const todos = await this.read();
      const remaining = todos.filter((todo) => !this.matches(todo, ownerId, id));
      if (remaining.length === todos.length) return false;

      await this.write(remaining);
      return true;
    });
  }

  private matches(todo: StoredTodo, ownerId: string, id: string): boolean {
    return todo.id === id && todo.ownerId === ownerId;
  }

  private owned(todos: StoredTodo[], ownerId: string): StoredTodo[] {
    return todos.filter((todo) => todo.ownerId === ownerId);
  }

  /** Scoped by owner, so another owner's id is indistinguishable from a missing one. */
  private find(todos: StoredTodo[], ownerId: string, id: string): StoredTodo | undefined {
    return todos.find((todo) => this.matches(todo, ownerId, id));
  }

  /** Runs the operation once all previously queued operations have settled. */
  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation);
    this.queue = result.catch(() => undefined); // a failed operation must not block the queue
    return result;
  }

  private async read(): Promise<StoredTodo[]> {
    let contents: string;
    try {
      contents = await readFile(this.filePath, 'utf8');
    } catch (error) {
      if (isFileNotFound(error)) return []; // first run: nothing has been saved yet
      throw error;
    }

    // Refuse to continue on unreadable data rather than overwrite it on the next write.
    let parsed: unknown;
    try {
      parsed = JSON.parse(contents);
    } catch (error) {
      throw new DataFileCorruptedError(this.filePath, { cause: error });
    }
    if (!Array.isArray(parsed) || !parsed.every(isStoredTodo)) {
      throw new DataFileCorruptedError(this.filePath);
    }
    return parsed;
  }

  private async write(todos: StoredTodo[]): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });

    const temporaryPath = `${this.filePath}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(todos, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, this.filePath);
  }
}

const isNullableString = (value: unknown) => value === null || typeof value === 'string';

/** Checks a record's shape, so a hand-edited or foreign file is refused rather than served. */
function isStoredTodo(value: unknown): value is StoredTodo {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.ownerId === 'string' &&
    typeof record.title === 'string' &&
    isNullableString(record.description) &&
    isNullableString(record.dueDate) &&
    typeof record.isCompleted === 'boolean' &&
    typeof record.createdAt === 'string'
  );
}

function isFileNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
