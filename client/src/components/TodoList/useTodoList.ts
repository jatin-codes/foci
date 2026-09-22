import { keepPreviousData, useMutation, useMutationState, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { send, sendForPage } from '@api/http.js';
import { todoKeys } from '@api/queryClient.js';
import type { Todo, TodoEdits, TodoListQuery } from '@api/types.js';
import { useInvalidateTodos } from '@hooks/useInvalidateTodos.js';

export type ItemMode = 'collapsed' | 'details' | 'editing';

export const PAGE_SIZE = 10;

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
  if (query.overdue) return 'No overdue to-dos.';
  if (query.isCompleted !== undefined) {
    return `No ${query.isCompleted ? 'completed' : 'incomplete'} to-dos.`;
  }
  return 'Nothing to do yet.';
}

export function useTodoList(
  query: TodoListQuery,
  page: number,
  onPageChange: (page: number) => void,
) {
  const invalidate = useInvalidateTodos();
  const [openItem, setOpenItem] = useState<{ id: string; mode: ItemMode } | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);

  const pageQuery = { ...query, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
  const list = useQuery({
    queryKey: todoKeys.list(pageQuery),
    queryFn: () => sendForPage<Todo>(`/todos${queryString(pageQuery)}`),
    placeholderData: keepPreviousData,
  });

  const total = list.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isShowingThisPage = list.isSuccess && !list.isPlaceholderData;
  const readError = list.error ? messageFor(list.error, 'Could not load to-dos') : null;

  // A delete can empty the last page; step back to the one that now is last.
  useEffect(() => {
    if (isShowingThisPage && page > pageCount) onPageChange(pageCount);
  }, [isShowingThisPage, page, pageCount, onPageChange]);

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
    todos: list.data?.items ?? [],
    total,
    pageCount,
    isLoading: list.isPending,
    isBusy: list.isFetching || busyIds.size > 0,
    isBusyRow: (id: string) => busyIds.has(id),
    emptyMessage: emptyMessage(query),
    // A failed refresh keeps the to-dos already on screen; only a first load has nothing to show.
    loadError: list.data ? null : readError,
    refreshError: list.data ? readError : null,
    writeError,
    modeFor: (id: string): ItemMode => (openItem?.id === id ? openItem.mode : 'collapsed'),
    setModeFor: (id: string, mode: ItemMode) =>
      setOpenItem(mode === 'collapsed' ? null : { id, mode }),
    toggle: (id: string, isCompleted: boolean) =>
      run(() => edit.mutateAsync({ id, edits: { isCompleted } }), 'Could not update the to-do'),
    save: (id: string, edits: TodoEdits) =>
      run(() => edit.mutateAsync({ id, edits }), 'Could not save the to-do'),
    remove: (id: string) => run(() => remove.mutateAsync({ id }), 'Could not delete the to-do'),
  };
}
