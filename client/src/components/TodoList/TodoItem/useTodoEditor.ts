import { useState, type SubmitEvent } from 'react';
import type { Todo, TodoEdits } from '../../../api/types.js';

/**
 * Holds the draft while a to-do is being edited, seeded from the to-do. A field
 * the user empties is sent as null, which is how the API clears an optional
 * value - distinct from omitting it, which would leave it untouched.
 */
export function useTodoEditor(todo: Todo, onSave: (edits: TodoEdits) => Promise<void>) {
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description ?? '');
  const [dueDate, setDueDate] = useState(todo.dueDate ?? '');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (title.trim() === '') return;

    setIsSaving(true);
    await onSave({
      title: title.trim(),
      description: description.trim() === '' ? null : description.trim(),
      dueDate: dueDate === '' ? null : dueDate,
    });
    setIsSaving(false);
  }

  return {
    title,
    setTitle,
    description,
    setDescription,
    dueDate,
    setDueDate,
    canSave: title.trim() !== '' && !isSaving,
    handleSubmit,
  };
}
