import type { Todo, TodoEdits } from '../../../api/types.js';
import './TodoItem.css';
import { TodoEditor } from './TodoEditor.js';

/** A row is collapsed, showing its details, or being edited - never two at once. */
export type ItemMode = 'collapsed' | 'details' | 'editing';

interface Props {
  todo: Todo;
  isOverdue: boolean;
  /** A write on this row is in flight, so its controls are inert until it lands. */
  isBusy: boolean;
  mode: ItemMode;
  onModeChange: (mode: ItemMode) => void;
  onToggle: (id: string, isCompleted: boolean) => Promise<void>;
  onSave: (id: string, edits: TodoEdits) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

const NONE = <span className="details-none">None</span>;

/** The fields that do not fit on the row, shown when it is expanded. */
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

export function TodoItem({
  todo,
  isOverdue,
  isBusy,
  mode,
  onModeChange,
  onToggle,
  onSave,
  onRemove,
}: Props) {
  const isOpen = mode !== 'collapsed';
  const classes = ['todo', todo.isCompleted ? 'done' : '', isBusy ? 'busy' : ''];

  /** Saving collapses the row; which mode it is in belongs to the list. */
  async function save(edits: TodoEdits) {
    await onSave(todo.id, edits);
    onModeChange('collapsed');
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
            <span className={isOverdue ? 'muted todo-overdue' : 'muted'}>
              due {todo.dueDate}
              {isOverdue && ' — overdue'}
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
        <button
          type="button"
          className="todo-delete"
          disabled={isBusy}
          onClick={() => void onRemove(todo.id)}
          aria-label={`Delete ${todo.title}`}
        >
          ×
        </button>
      </div>

      {mode === 'details' && <Details todo={todo} />}
      {mode === 'editing' && (
        <TodoEditor todo={todo} onSave={save} onCancel={() => onModeChange('collapsed')} />
      )}
    </li>
  );
}
