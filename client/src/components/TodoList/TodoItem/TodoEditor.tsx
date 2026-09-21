import type { TodoEdits } from '../../../api/client.js';
import type { Todo } from '../../../api/types.js';
import { useTodoEditor } from './useTodoEditor.js';

interface Props {
  todo: Todo;
  onSave: (edits: TodoEdits) => Promise<void>;
  onCancel: () => void;
}

export function TodoEditor({ todo, onSave, onCancel }: Props) {
  const editor = useTodoEditor(todo, onSave);

  return (
    <form className="editor" onSubmit={editor.handleSubmit}>
      <input
        aria-label="Title"
        value={editor.title}
        maxLength={200}
        onChange={(event) => editor.setTitle(event.target.value)}
        autoFocus
      />
      <textarea
        aria-label="Description"
        placeholder="Description (optional)"
        maxLength={2000}
        rows={2}
        value={editor.description}
        onChange={(event) => editor.setDescription(event.target.value)}
      />
      <div className="editor-actions">
        <input
          type="date"
          aria-label="Due date"
          value={editor.dueDate}
          onChange={(event) => editor.setDueDate(event.target.value)}
        />
        <span className="editor-spacer" />
        <button type="button" className="chip" onClick={onCancel}>
          Cancel
        </button>
        <button disabled={!editor.canSave}>Save</button>
      </div>
    </form>
  );
}
