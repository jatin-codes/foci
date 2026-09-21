import './Pagination.css';

interface PaginationProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <nav className="pagination" aria-label="Pages">
      <button
        type="button"
        className="chip"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </button>
      <span className="muted">
        Page {page} of {pageCount}
      </span>
      <button
        type="button"
        className="chip"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
