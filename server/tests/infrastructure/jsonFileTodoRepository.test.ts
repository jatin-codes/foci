import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DataFileCorruptedError,
  JsonFileTodoRepository,
} from '../../src/infrastructure/jsonFileTodoRepository.js';
import { buildTodo } from '../support/buildTodo.js';
import { describeTodoRepositoryContract } from '../support/todoRepositoryContract.js';

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'todo-api-'));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describeTodoRepositoryContract(
  'JsonFileTodoRepository',
  () => new JsonFileTodoRepository(path.join(directory, 'todos.json')),
);

const OWNER = 'owner-1';

describe('JsonFileTodoRepository persistence', () => {
  it('keeps data across repository instances, as it would across application runs', async () => {
    const filePath = path.join(directory, 'todos.json');
    const todo = buildTodo({ id: 'a' });
    await new JsonFileTodoRepository(filePath).add(OWNER, todo);

    const reopened = new JsonFileTodoRepository(filePath);

    expect(await reopened.list(OWNER)).toEqual([todo]);
  });

  it('stores the owner alongside each to-do but keeps it out of the to-do itself', async () => {
    const filePath = path.join(directory, 'todos.json');
    const repository = new JsonFileTodoRepository(filePath);

    await repository.add(OWNER, buildTodo({ id: 'a' }));

    const [stored] = JSON.parse(await readFile(filePath, 'utf8'));
    expect(stored.ownerId).toBe(OWNER);
    expect(await repository.get(OWNER, 'a')).not.toHaveProperty('ownerId');
  });

  it('creates the data directory when it does not exist yet', async () => {
    const filePath = path.join(directory, 'nested', 'data', 'todos.json');

    await new JsonFileTodoRepository(filePath).add(OWNER, buildTodo({ id: 'a' }));

    expect(JSON.parse(await readFile(filePath, 'utf8'))).toHaveLength(1);
  });

  it('does not lose writes when operations are issued concurrently', async () => {
    const repository = new JsonFileTodoRepository(path.join(directory, 'todos.json'));
    const ids = Array.from({ length: 20 }, (_, index) => `todo-${index}`);

    await Promise.all(ids.map((id) => repository.add(OWNER, buildTodo({ id }))));

    expect((await repository.list(OWNER)).map((todo) => todo.id)).toEqual(ids);
  });

  it.each([
    ['malformed JSON', '{ not json'],
    ['JSON that is not a list', '{"todos": []}'],
  ])('rejects with DataFileCorruptedError for %s and leaves the file untouched', async (_, raw) => {
    const filePath = path.join(directory, 'todos.json');
    await writeFile(filePath, raw, 'utf8');
    const repository = new JsonFileTodoRepository(filePath);

    await expect(repository.list(OWNER)).rejects.toThrow(DataFileCorruptedError);
    await expect(repository.add(OWNER, buildTodo())).rejects.toThrow(DataFileCorruptedError);

    expect(await readFile(filePath, 'utf8')).toBe(raw);
  });

  it('keeps serving operations after one has failed', async () => {
    const filePath = path.join(directory, 'todos.json');
    await writeFile(filePath, '{ not json', 'utf8');
    const repository = new JsonFileTodoRepository(filePath);
    await expect(repository.list(OWNER)).rejects.toThrow(DataFileCorruptedError);

    await writeFile(filePath, '[]', 'utf8');

    expect(await repository.list(OWNER)).toEqual([]);
  });
});
