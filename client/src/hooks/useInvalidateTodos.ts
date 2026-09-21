import { useQueryClient } from '@tanstack/react-query';
import { todoKeys } from '@api/queryClient.js';

export function useInvalidateTodos(): () => Promise<void> {
  const cache = useQueryClient();
  return async () => {
    await cache.invalidateQueries({ queryKey: todoKeys.all });
  };
}
