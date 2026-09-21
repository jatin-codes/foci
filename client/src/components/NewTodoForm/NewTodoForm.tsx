import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from '@api/types.js';
import './NewTodoForm.css';
import { useNewTodoForm } from './useNewTodoForm.js';

export function NewTodoForm() {
  const form = useNewTodoForm();

  return (
    <form className="new" onSubmit={form.handleSubmit}>
      <div className="new-row">
        <input
          name="title"
          placeholder="What needs doing?"
          maxLength={TITLE_MAX_LENGTH}
          value={form.title}
          onChange={(event) => form.setTitle(event.target.value)}
          autoFocus
        />
        <input
          name="dueDate"
          type="date"
          aria-label="Due date"
          value={form.dueDate}
          onChange={(event) => form.setDueDate(event.target.value)}
        />
        <button disabled={!form.canSubmit}>Add</button>
      </div>

      {form.showDescription ? (
        <textarea
          name="description"
          aria-label="Description"
          placeholder="Description (optional)"
          maxLength={DESCRIPTION_MAX_LENGTH}
          rows={2}
          value={form.description}
          onChange={(event) => form.setDescription(event.target.value)}
        />
      ) : (
        <button
          type="button"
          className="new-description-toggle"
          onClick={form.showDescriptionField}
        >
          + Add a description
        </button>
      )}
      {form.error && (
        <p role="alert" className="muted new-error">
          {form.error}
        </p>
      )}
    </form>
  );
}
