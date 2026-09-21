import { useState } from 'react';
import type { Todo, TodoEdits } from '@api/types.js';
import './TodoItem.css';
import type { ItemMode } from '@components/TodoList/useTodoList.js';
import { TodoEditor } from './TodoEditor.js';

interface Props {
  todo: Todo;
  isBusy: boolean;
  mode: ItemMode;
  onModeChange: (mode: ItemMode) => void;
  onToggle: (id: string, isCompleted: boolean) => Promise<boolean>;
  onSave: (id: string, edits: TodoEdits) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
}

const NONE = <span className="details-none">None</span>;

function Details({ todo }: { todo: Todo }) {
  return (
    <dl className="details">
      <dt>Description</dt>
      <dd>{todo.description ?? NONE}</dd>

      <dt>Due date</dt>
      <dd>{todo.dueDate ?? NONE}</dd>

      <dt>Status</dt>
      <dd>{todo.isCompleted ? 'Completed' : 'Not completed'}</dd>

      <dt>Created</dt>
      <dd>{new Date(todo.createdAt).toLocaleString()}</dd>
    </dl>
  );
}

export function TodoItem({ todo, isBusy, mode, onModeChange, onToggle, onSave, onRemove }: Props) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const isOpen = mode !== 'collapsed';
  const classes = ['todo', todo.isCompleted ? 'done' : '', isBusy ? 'busy' : ''];

  async function save(edits: TodoEdits): Promise<void> {
    if (await onSave(todo.id, edits)) onModeChange('collapsed');
  }

  return (
    <li className={classes.filter(Boolean).join(' ')} aria-busy={isBusy}>
      <div className="todo-row">
        <input
          type="checkbox"
          className="todo-checkbox"
          checked={todo.isCompleted}
          disabled={isBusy}
          onChange={(event) => void onToggle(todo.id, event.target.checked)}
          aria-label={`Mark "${todo.title}" as ${todo.isCompleted ? 'not completed' : 'completed'}`}
        />

        <button
          type="button"
          className="todo-text"
          aria-expanded={isOpen}
          aria-label={`${isOpen ? 'Hide' : 'Show'} details for ${todo.title}`}
          onClick={() => onModeChange(isOpen ? 'collapsed' : 'details')}
        >
          <span className="todo-title">{todo.title}</span>
          {todo.dueDate && (
            <span className={todo.isOverdue ? 'muted todo-overdue' : 'muted'}>
              due {todo.dueDate}
              {todo.isOverdue && ' — overdue'}
            </span>
          )}
        </button>

        <button
          type="button"
          className="chip"
          disabled={isBusy}
          onClick={() => onModeChange(mode === 'editing' ? 'collapsed' : 'editing')}
          aria-label={`Edit ${todo.title}`}
        >
          Edit
        </button>
        {isConfirmingDelete ? (
          <>
            <button
              type="button"
              className="chip todo-confirm-delete"
              disabled={isBusy}
              onClick={() => void onRemove(todo.id)}
              aria-label={`Confirm delete ${todo.title}`}
              autoFocus
            >
              Delete
            </button>
            <button
              type="button"
              className="chip"
              disabled={isBusy}
              onClick={() => setIsConfirmingDelete(false)}
              aria-label={`Keep ${todo.title}`}
            >
              Keep
            </button>
          </>
        ) : (
          <button
            type="button"
            className="todo-delete"
            disabled={isBusy}
            onClick={() => setIsConfirmingDelete(true)}
            aria-label={`Delete ${todo.title}`}
          >
            ×
          </button>
        )}
      </div>

      {mode === 'details' && <Details todo={todo} />}
      {mode === 'editing' && (
        <TodoEditor todo={todo} onSave={save} onCancel={() => onModeChange('collapsed')} />
      )}
    </li>
  );
}
