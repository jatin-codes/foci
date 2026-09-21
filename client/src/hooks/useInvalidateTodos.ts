import { useQueryClient } from '@tanstack/react-query';
import { todoKeys } from '../api/queryClient.js';

/**
 * Marks every cached list stale. Writes live in the component that offers them -
 * adding is the form's business, completing is a row's - but any of them can
 * change what a list should show, so they all invalidate through here.
 */
export function useInvalidateTodos(): () => Promise<void> {
  const cache = useQueryClient();
  return async () => {
    await cache.invalidateQueries({ queryKey: todoKeys.all });
  };
}
