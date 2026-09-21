import { useMutation } from '@tanstack/react-query';
import { useState, type SubmitEvent } from 'react';
import { send } from '../../api/http.js';
import type { Todo } from '../../api/types.js';
import { useInvalidateTodos } from '../../hooks/useInvalidateTodos.js';

interface NewTodo {
  title: string;
  description?: string;
  dueDate?: string;
}

/**
 * The form's own state: the three draft fields, and the request that saves them.
 * The component renders what this returns and owns nothing itself.
 */
export function useNewTodoForm() {
  const invalidate = useInvalidateTodos();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showDescription, setShowDescription] = useState(false);

  const create = useMutation({
    mutationFn: (todo: NewTodo) =>
      send<Todo>('/todos', { method: 'POST', body: JSON.stringify(todo) }),
    onSuccess: invalidate,
  });

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (title.trim() === '') return;

    // Optional fields are omitted rather than sent blank, so the API applies its defaults.
    const saved = await create
      .mutateAsync({
        title: title.trim(),
        ...(description.trim() === '' ? {} : { description: description.trim() }),
        ...(dueDate === '' ? {} : { dueDate }),
      })
      .catch(() => null);

    // A failed save keeps the draft, so the user can retry without retyping.
    if (!saved) return;
    setTitle('');
    setDescription('');
    setDueDate('');
    setShowDescription(false);
  }

  return {
    title,
    setTitle,
    description,
    setDescription,
    dueDate,
    setDueDate,
    showDescription,
    showDescriptionField: () => setShowDescription(true),
    canSubmit: title.trim() !== '' && !create.isPending,
    error: create.error ? create.error.message : null,
    handleSubmit,
  };
}
