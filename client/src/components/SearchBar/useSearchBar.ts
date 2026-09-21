import { useEffect, useState } from 'react';
import { useDebouncedValue } from '@hooks/useDebouncedValue.js';

export function useSearchBar({ onSearch }: { onSearch: (search: string) => void }) {
  const [value, setValue] = useState('');
  const settled = useDebouncedValue(value);

  useEffect(() => {
    onSearch(settled);
  }, [settled, onSearch]);

  return {
    value,
    setValue,
    clear: () => {
      setValue('');
      onSearch('');
    },
  };
}
