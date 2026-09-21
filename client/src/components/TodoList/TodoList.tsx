import type { TodoListQuery } from '../../api/types.js';
import { TodoItem } from './TodoItem/TodoItem.js';
import './TodoList.css';
import { useTodoList } from './useTodoList.js';

interface Props {
  /** What to show: the filter, sort and search the API should apply. */
  query: TodoListQuery;
}

export function TodoList({ query }: Props) {
  const list = useTodoList(query);

  if (list.error) {
    return (
      <p role="alert" className="muted list-error">
        {list.error}
      </p>
    );
  }

  if (list.isLoading) return <p className="muted list-empty">Loading…</p>;
  if (list.todos.length === 0) return <p className="muted list-empty">{list.emptyMessage}</p>;

  return (
    <>
      <ul className="todos">
        {list.todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            isOverdue={list.isOverdue(todo)}
            isBusy={list.busyId === todo.id}
            mode={list.modeFor(todo.id)}
            onModeChange={(mode) => list.openItemChange(todo.id, mode)}
            onToggle={list.toggle}
            onSave={list.save}
            onRemove={list.remove}
          />
        ))}
      </ul>
      <p className="muted list-count" aria-live="polite">
        {list.todos.length === 1 ? '1 to-do' : `${list.todos.length} to-dos`}
        {list.isBusy && <span className="list-updating"> · updating…</span>}
      </p>
    </>
  );
}
