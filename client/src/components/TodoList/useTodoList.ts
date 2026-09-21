import { useMutation, useQuery, keepPreviousData } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type TodoEdits } from '../../api/client.js';
import { todoKeys } from '../../api/queryClient.js';
import type { Todo, TodoListQuery } from '../../api/types.js';
import { useInvalidateTodos } from '../../hooks/useInvalidateTodos.js';
import { isOverdue, todayAsCalendarDate } from '../../utils/date.js';
import type { ItemMode } from './TodoItem/TodoItem.js';

function messageFor(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

/** Says why the list is empty, so a search with no hits does not read as an empty app. */
function emptyMessage(query: TodoListQuery): string {
  if (query.search) return `No to-dos match "${query.search}".`;
  const status = query.status ?? 'all';
  return status === 'all' ? 'Nothing to do yet.' : `No ${status} to-dos.`;
}

/**
 * Everything the list does: which to-dos it shows, the writes its rows offer,
 * and which single row is expanded.
 *
 * The query is part of the cache key, so each filter caches separately and going
 * back to one is instant; `keepPreviousData` keeps the current list on screen
 * while a new one loads, so narrowing a search does not blank the page.
 */
export function useTodoList(query: TodoListQuery) {
  const invalidate = useInvalidateTodos();
  // At most one row is expanded or being edited at a time.
  const [openItem, setOpenItem] = useState<{ id: string; mode: ItemMode } | null>(null);

  const list = useQuery({
    queryKey: todoKeys.list(query),
    queryFn: () => api.list(query),
    placeholderData: keepPreviousData,
  });

  const edit = useMutation({
    mutationFn: ({ id, edits }: { id: string; edits: TodoEdits }) => api.update(id, edits),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: invalidate,
  });

  const setCompleted = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      api.setCompleted(id, isCompleted),
    onSuccess: invalidate,
  });

  const writes = [edit, remove, setCompleted];
  const failed = writes.find((write) => write.error);
  const today = todayAsCalendarDate();

  /** The row a write is currently working on, so it can show it is busy. */
  const busyId =
    (remove.isPending ? remove.variables : undefined) ??
    (setCompleted.isPending ? setCompleted.variables.id : undefined) ??
    (edit.isPending ? edit.variables.id : undefined) ??
    null;

  return {
    todos: (list.data ?? []) as Todo[],
    isLoading: list.isPending,
    /** True while any request is in flight, including a background refresh. */
    isBusy: list.isFetching || writes.some((write) => write.isPending),
    busyId,
    emptyMessage: emptyMessage(query),
    error: list.error
      ? messageFor(list.error, 'Could not load to-dos')
      : failed
        ? messageFor(failed.error, 'Something went wrong')
        : null,
    isOverdue: (todo: Todo) => isOverdue(todo, today),
    modeFor: (id: string): ItemMode => (openItem?.id === id ? openItem.mode : 'collapsed'),
    openItemChange: (id: string, mode: ItemMode) =>
      setOpenItem(mode === 'collapsed' ? null : { id, mode }),
    toggle: async (id: string, isCompleted: boolean) => {
      await setCompleted.mutateAsync({ id, isCompleted }).catch(() => undefined);
    },
    save: async (id: string, edits: TodoEdits) => {
      await edit.mutateAsync({ id, edits }).catch(() => undefined);
    },
    remove: async (id: string) => {
      await remove.mutateAsync(id).catch(() => undefined);
    },
  };
}
