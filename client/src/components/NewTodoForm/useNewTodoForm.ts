import { useMutation } from '@tanstack/react-query';
import { useState, type SubmitEvent } from 'react';
import { api, type NewTodo } from '../../api/client.js';
import { useInvalidateTodos } from '../../hooks/useInvalidateTodos.js';

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
    mutationFn: (todo: NewTodo) => api.create(todo),
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
