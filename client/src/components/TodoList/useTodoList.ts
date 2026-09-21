import { keepPreviousData, useMutation, useMutationState, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { send } from '../../api/http.js';
import { todoKeys } from '../../api/queryClient.js';
import type { Todo, TodoEdits, TodoListQuery } from '../../api/types.js';
import { useInvalidateTodos } from '../../hooks/useInvalidateTodos.js';

/** A row is collapsed, showing its details, or being edited - never two at once. */
export type ItemMode = 'collapsed' | 'details' | 'editing';

function queryString(query: TodoListQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.size === 0 ? '' : `?${params}`;
}

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
 *
 * A failed write is reported next to the list rather than instead of it, so the
 * user can still see their to-dos and try again. The next write clears it.
 */
export function useTodoList(query: TodoListQuery) {
  const invalidate = useInvalidateTodos();
  // At most one row is expanded or being edited at a time.
  const [openItem, setOpenItem] = useState<{ id: string; mode: ItemMode } | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: todoKeys.list(query),
    queryFn: () => send<Todo[]>(`/todos${queryString(query)}`),
    placeholderData: keepPreviousData,
  });

  // Every row write shares one key, so the ones in flight can be read back below.
  const edit = useMutation({
    mutationKey: todoKeys.rowWrite,
    mutationFn: ({ id, edits }: { id: string; edits: TodoEdits }) =>
      send<Todo>(`/todos/${id}`, { method: 'PATCH', body: JSON.stringify(edits) }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationKey: todoKeys.rowWrite,
    mutationFn: ({ id }: { id: string }) => send<void>(`/todos/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  const setCompleted = useMutation({
    mutationKey: todoKeys.rowWrite,
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      send<Todo>(`/todos/${id}/${isCompleted ? 'complete' : 'incomplete'}`, { method: 'POST' }),
    onSuccess: invalidate,
  });

  /** Every row with a write in flight - not just the latest - so each shows it is busy. */
  const busyIds = new Set(
    useMutationState({
      filters: { mutationKey: todoKeys.rowWrite, status: 'pending' },
      select: (mutation) => (mutation.state.variables as { id: string }).id,
    }),
  );

  /** Runs a write, recording why it failed. Resolves to whether it succeeded. */
  async function run(write: () => Promise<unknown>, fallback: string): Promise<boolean> {
    setWriteError(null);
    try {
      await write();
      return true;
    } catch (caught) {
      setWriteError(messageFor(caught, fallback));
      return false;
    }
  }

  return {
    todos: list.data ?? [],
    isLoading: list.isPending,
    /** True while any request is in flight, including a background refresh. */
    isBusy: list.isFetching || busyIds.size > 0,
    isBusyRow: (id: string) => busyIds.has(id),
    emptyMessage: emptyMessage(query),
    /** The list could not be loaded, so there is nothing to show. */
    loadError: list.error ? messageFor(list.error, 'Could not load to-dos') : null,
    /** A write failed; the list is still shown. */
    writeError,
    modeFor: (id: string): ItemMode => (openItem?.id === id ? openItem.mode : 'collapsed'),
    openItemChange: (id: string, mode: ItemMode) =>
      setOpenItem(mode === 'collapsed' ? null : { id, mode }),
    toggle: (id: string, isCompleted: boolean) =>
      run(() => setCompleted.mutateAsync({ id, isCompleted }), 'Could not update the to-do'),
    save: (id: string, edits: TodoEdits) =>
      run(() => edit.mutateAsync({ id, edits }), 'Could not save the to-do'),
    remove: (id: string) => run(() => remove.mutateAsync({ id }), 'Could not delete the to-do'),
  };
}
