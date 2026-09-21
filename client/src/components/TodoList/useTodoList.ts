import { keepPreviousData, useMutation, useMutationState, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { send } from '@api/http.js';
import { todoKeys } from '@api/queryClient.js';
import type { Todo, TodoEdits, TodoListQuery } from '@api/types.js';
import { useInvalidateTodos } from '@hooks/useInvalidateTodos.js';

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

function emptyMessage(query: TodoListQuery): string {
  if (query.search) return `No to-dos match "${query.search}".`;
  const status = query.status ?? 'all';
  return status === 'all' ? 'Nothing to do yet.' : `No ${status} to-dos.`;
}

export function useTodoList(query: TodoListQuery) {
  const invalidate = useInvalidateTodos();
  const [openItem, setOpenItem] = useState<{ id: string; mode: ItemMode } | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: todoKeys.list(query),
    queryFn: () => send<Todo[]>(`/todos${queryString(query)}`),
    placeholderData: keepPreviousData,
  });

  // A shared key lets useMutationState find every row write in flight.
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

  const busyIds = new Set(
    useMutationState({
      filters: { mutationKey: todoKeys.rowWrite, status: 'pending' },
      select: (mutation) => (mutation.state.variables as { id: string }).id,
    }),
  );

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
    isBusy: list.isFetching || busyIds.size > 0,
    isBusyRow: (id: string) => busyIds.has(id),
    emptyMessage: emptyMessage(query),
    loadError: list.error ? messageFor(list.error, 'Could not load to-dos') : null,
    writeError,
    modeFor: (id: string): ItemMode => (openItem?.id === id ? openItem.mode : 'collapsed'),
    setModeFor: (id: string, mode: ItemMode) =>
      setOpenItem(mode === 'collapsed' ? null : { id, mode }),
    toggle: (id: string, isCompleted: boolean) =>
      run(() => setCompleted.mutateAsync({ id, isCompleted }), 'Could not update the to-do'),
    save: (id: string, edits: TodoEdits) =>
      run(() => edit.mutateAsync({ id, edits }), 'Could not save the to-do'),
    remove: (id: string) => run(() => remove.mutateAsync({ id }), 'Could not delete the to-do'),
  };
}
