import { beforeEach, describe, expect, it } from 'vitest';
import type { TodoRepository } from '../../src/application/todoRepository.js';
import { buildTodo } from './buildTodo.js';

const OWNER = 'owner-1';
const OTHER_OWNER = 'owner-2';

export function describeTodoRepositoryContract(
  name: string,
  createRepository: () => TodoRepository | Promise<TodoRepository>,
): void {
  describe(`${name} (TodoRepository contract)`, () => {
    let repository: TodoRepository;

    beforeEach(async () => {
      repository = await createRepository();
    });

    it('starts empty', async () => {
      expect(await repository.list(OWNER)).toEqual([]);
    });

    it('returns an added to-do by id', async () => {
      const todo = buildTodo({ id: 'a', description: 'Semi-skimmed', dueDate: '2025-03-01' });

      await repository.add(OWNER, todo);

      expect(await repository.get(OWNER, 'a')).toEqual(todo);
    });

    it('returns null for an unknown id', async () => {
      expect(await repository.get(OWNER, 'missing')).toBeNull();
    });

    it('lists to-dos in the order they were added', async () => {
      await repository.add(OWNER, buildTodo({ id: 'first' }));
      await repository.add(OWNER, buildTodo({ id: 'second' }));
      await repository.add(OWNER, buildTodo({ id: 'third' }));

      const ids = (await repository.list(OWNER)).map((todo) => todo.id);

      expect(ids).toEqual(['first', 'second', 'third']);
    });

    it('applies only the provided changes and returns the updated to-do', async () => {
      const original = buildTodo({ id: 'a', title: 'Old title', dueDate: '2025-03-01' });
      await repository.add(OWNER, original);

      const updated = await repository.update(OWNER, 'a', {
        title: 'New title',
        isCompleted: true,
      });

      expect(updated).toEqual({ ...original, title: 'New title', isCompleted: true });
      expect(await repository.get(OWNER, 'a')).toEqual(updated);
    });

    it('clears a nullable field when it is changed to null', async () => {
      await repository.add(OWNER, buildTodo({ id: 'a', dueDate: '2025-03-01' }));

      const updated = await repository.update(OWNER, 'a', { dueDate: null });

      expect(updated?.dueDate).toBeNull();
    });

    it('ignores changes whose value is undefined', async () => {
      await repository.add(OWNER, buildTodo({ id: 'a', title: 'Keep me' }));

      const updated = await repository.update(OWNER, 'a', { title: undefined, isCompleted: true });

      expect(updated?.title).toBe('Keep me');
    });

    it('returns null when updating an unknown id', async () => {
      expect(await repository.update(OWNER, 'missing', { title: 'Nope' })).toBeNull();
    });

    it('removes a to-do', async () => {
      await repository.add(OWNER, buildTodo({ id: 'a' }));
      await repository.add(OWNER, buildTodo({ id: 'b' }));

      expect(await repository.remove(OWNER, 'a')).toBe(true);

      expect(await repository.get(OWNER, 'a')).toBeNull();
      expect((await repository.list(OWNER)).map((todo) => todo.id)).toEqual(['b']);
    });

    it('reports false when removing an unknown id', async () => {
      expect(await repository.remove(OWNER, 'missing')).toBe(false);
    });

    describe('keeping owners apart', () => {
      it("lists only the owner's own to-dos", async () => {
        await repository.add(OWNER, buildTodo({ id: 'mine' }));
        await repository.add(OTHER_OWNER, buildTodo({ id: 'theirs' }));

        expect((await repository.list(OWNER)).map((todo) => todo.id)).toEqual(['mine']);
        expect((await repository.list(OTHER_OWNER)).map((todo) => todo.id)).toEqual(['theirs']);
      });

      it("treats another owner's id as missing rather than returning it", async () => {
        await repository.add(OTHER_OWNER, buildTodo({ id: 'theirs' }));

        expect(await repository.get(OWNER, 'theirs')).toBeNull();
      });

      it("refuses to update another owner's to-do", async () => {
        await repository.add(OTHER_OWNER, buildTodo({ id: 'theirs', title: 'Untouched' }));

        expect(await repository.update(OWNER, 'theirs', { title: 'Hijacked' })).toBeNull();
        expect((await repository.get(OTHER_OWNER, 'theirs'))?.title).toBe('Untouched');
      });

      it("refuses to remove another owner's to-do", async () => {
        await repository.add(OTHER_OWNER, buildTodo({ id: 'theirs' }));

        expect(await repository.remove(OWNER, 'theirs')).toBe(false);
        expect(await repository.get(OTHER_OWNER, 'theirs')).not.toBeNull();
      });

      it('keeps ids that collide between owners separate', async () => {
        await repository.add(OWNER, buildTodo({ id: 'same', title: 'Mine' }));
        await repository.add(OTHER_OWNER, buildTodo({ id: 'same', title: 'Theirs' }));

        expect((await repository.get(OWNER, 'same'))?.title).toBe('Mine');
        expect((await repository.get(OTHER_OWNER, 'same'))?.title).toBe('Theirs');
      });
    });
  });
}
