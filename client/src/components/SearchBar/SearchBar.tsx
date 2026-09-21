import './SearchBar.css';
import { useSearchBar } from './useSearchBar.js';

export interface SearchBarProps {
  /** Called with the settled search text, not with every keystroke. */
  onSearch: (search: string) => void;
}

export function SearchBar(props: SearchBarProps) {
  const { value, setValue, clear } = useSearchBar(props);

  return (
    <div className="search">
      <input
        type="search"
        placeholder="Search to-dos…"
        aria-label="Search to-dos"
        maxLength={200}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      {value !== '' && (
        <button type="button" className="search-clear" aria-label="Clear search" onClick={clear}>
          ×
        </button>
      )}
    </div>
  );
}
