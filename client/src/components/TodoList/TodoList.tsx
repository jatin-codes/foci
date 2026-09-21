import type { TodoListQuery } from '@api/types.js';
import { Pagination } from '@components/TodoList/Pagination/Pagination.js';
import { TodoItem } from '@components/TodoList/TodoItem/TodoItem.js';
import './TodoList.css';
import { useTodoList } from './useTodoList.js';

interface TodoListProps {
  query: TodoListQuery;
  page: number;
  onPageChange: (page: number) => void;
}

export function TodoList({ query, page, onPageChange }: TodoListProps) {
  const list = useTodoList(query, page, onPageChange);

  if (list.loadError) {
    return (
      <p role="alert" className="muted list-error">
        {list.loadError}
      </p>
    );
  }

  if (list.isLoading) return <p className="muted list-empty">Loading…</p>;

  const alert = list.writeError ?? list.refreshError;

  return (
    <>
      {alert && (
        <p role="alert" className="muted list-error">
          {alert}
        </p>
      )}
      {list.todos.length === 0 ? (
        <p className="muted list-empty">{list.emptyMessage}</p>
      ) : (
        <>
          <ul className="todos">
            {list.todos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                isBusy={list.isBusyRow(todo.id)}
                mode={list.modeFor(todo.id)}
                onModeChange={(mode) => list.setModeFor(todo.id, mode)}
                onToggle={list.toggle}
                onSave={list.save}
                onRemove={list.remove}
              />
            ))}
          </ul>
          <p className="muted list-count" aria-live="polite">
            {list.total === 1 ? '1 to-do' : `${list.total} to-dos`}
            {list.isBusy && <span className="list-updating"> · updating…</span>}
          </p>
          <Pagination page={page} pageCount={list.pageCount} onChange={onPageChange} />
        </>
      )}
    </>
  );
}
