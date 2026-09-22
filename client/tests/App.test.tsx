import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTodo, LOAD_FAILURE_MESSAGE, WRITE_FAILURE_MESSAGE } from './support/fakeApi.js';
import { renderApp } from './support/renderApp.js';

function rowFor(title: string) {
  return screen.getByText(title).closest('li')!;
}

function bodiesSent(method: string): unknown[] {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([, init]) => init?.method === method)
    .map(([, init]) => JSON.parse(init!.body as string));
}

function lastListQuery(): URLSearchParams {
  const listUrls = vi
    .mocked(fetch)
    .mock.calls.filter(([, init]) => (init?.method ?? 'GET') === 'GET')
    .map(([url]) => String(url));
  return new URLSearchParams(listUrls.at(-1)!.split('?')[1] ?? '');
}

async function deleteTodo(title: string) {
  await userEvent.click(screen.getByRole('button', { name: `Delete ${title}` }));
  await userEvent.click(screen.getByRole('button', { name: `Confirm delete ${title}` }));
}

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('listing', () => {
    it('shows the to-dos it loads', async () => {
      renderApp([buildTodo({ title: 'Write README', dueDate: '2025-06-20' })]);

      expect(await screen.findByText('Write README')).toBeInTheDocument();
      expect(screen.getByText(/due 2025-06-20/)).toBeInTheDocument();
      expect(screen.getByText('1 to-do')).toBeInTheDocument();
    });

    it('flags a to-do as overdue when the server says it is', async () => {
      renderApp([
        buildTodo({ id: 'a', title: 'Late', dueDate: '2025-06-01', isOverdue: true }),
        buildTodo({ id: 'b', title: 'On time', dueDate: '2025-06-01', isOverdue: false }),
      ]);
      await screen.findByText('Late');

      expect(within(rowFor('Late')).getByText(/overdue/)).toBeInTheDocument();
      expect(within(rowFor('On time')).queryByText(/overdue/)).not.toBeInTheDocument();
    });

    it('reports when the list cannot be loaded', async () => {
      renderApp([buildTodo()], { failReadsAfter: 0 });

      expect(await screen.findByRole('alert')).toHaveTextContent(LOAD_FAILURE_MESSAGE);
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('keeps the list on screen when a refresh fails', async () => {
      renderApp([buildTodo({ title: 'Buy milk' })], { failReadsAfter: 1 });
      await screen.findByText('Buy milk');

      await userEvent.click(screen.getByRole('checkbox', { name: /Buy milk/ }));

      expect(await screen.findByRole('alert')).toHaveTextContent(LOAD_FAILURE_MESSAGE);
      expect(screen.getByText('Buy milk')).toBeInTheDocument();
    });

    it('shows a message when there is nothing to do', async () => {
      renderApp([]);

      expect(await screen.findByText('Nothing to do yet.')).toBeInTheDocument();
    });
  });

  describe('adding', () => {
    it('adds a to-do from the form', async () => {
      renderApp([]);
      await screen.findByText('Nothing to do yet.');

      await userEvent.type(screen.getByPlaceholderText('What needs doing?'), 'Buy milk');
      await userEvent.click(screen.getByRole('button', { name: 'Add' }));

      expect(await screen.findByText('Buy milk')).toBeInTheDocument();
    });

    it('sends a description and due date when given, then resets the form', async () => {
      renderApp([]);
      await screen.findByText('Nothing to do yet.');

      await userEvent.type(screen.getByPlaceholderText('What needs doing?'), 'Buy milk');
      await userEvent.type(screen.getByLabelText('Due date'), '2025-06-20');
      await userEvent.click(screen.getByRole('button', { name: '+ Add a description' }));
      await userEvent.type(screen.getByLabelText('Description'), 'Semi-skimmed');
      await userEvent.click(screen.getByRole('button', { name: 'Add' }));

      expect(await screen.findByText('Buy milk')).toBeInTheDocument();
      expect(bodiesSent('POST')).toEqual([
        { title: 'Buy milk', description: 'Semi-skimmed', dueDate: '2025-06-20' },
      ]);
      expect(screen.getByPlaceholderText('What needs doing?')).toHaveValue('');
      expect(screen.queryByLabelText('Description')).not.toBeInTheDocument();
    });
  });

  describe('viewing', () => {
    it('expands a to-do to show its full details', async () => {
      renderApp([buildTodo({ title: 'Buy milk', description: 'Semi-skimmed' })]);
      await screen.findByText('Buy milk');

      await userEvent.click(screen.getByRole('button', { name: 'Show details for Buy milk' }));

      expect(screen.getByText('Semi-skimmed')).toBeInTheDocument();
      expect(screen.getByText('Not completed')).toBeInTheDocument();
    });
  });

  describe('updating', () => {
    it('saves an edited title, and clears a due date the user empties', async () => {
      renderApp([buildTodo({ title: 'Buy milk', dueDate: '2025-06-20' })]);
      await screen.findByText('Buy milk');

      await userEvent.click(screen.getByRole('button', { name: 'Edit Buy milk' }));
      const title = screen.getByLabelText('Title');
      await userEvent.clear(title);
      await userEvent.type(title, 'Buy oat milk');
      await userEvent.clear(within(rowFor('Buy milk')).getByLabelText('Due date'));
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(await screen.findByText('Buy oat milk')).toBeInTheDocument();
      expect(screen.queryByText(/due 2025-06-20/)).not.toBeInTheDocument();
      expect(bodiesSent('PATCH')).toEqual([
        { title: 'Buy oat milk', description: null, dueDate: null },
      ]);
    });

    it('discards the draft when editing is cancelled', async () => {
      renderApp([buildTodo({ title: 'Buy milk' })]);
      await screen.findByText('Buy milk');

      await userEvent.click(screen.getByRole('button', { name: 'Edit Buy milk' }));
      await userEvent.type(screen.getByLabelText('Title'), ' and bread');
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
      expect(screen.getByText('Buy milk')).toBeInTheDocument();
      expect(bodiesSent('PATCH')).toEqual([]);
    });
  });

  describe('completing', () => {
    it('marks a to-do as completed and back again', async () => {
      renderApp([buildTodo({ title: 'Buy milk' })]);
      await screen.findByText('Buy milk');

      await userEvent.click(within(rowFor('Buy milk')).getByRole('checkbox'));
      await waitFor(() => expect(within(rowFor('Buy milk')).getByRole('checkbox')).toBeChecked());

      await userEvent.click(within(rowFor('Buy milk')).getByRole('checkbox'));
      await waitFor(() =>
        expect(within(rowFor('Buy milk')).getByRole('checkbox')).not.toBeChecked(),
      );
      expect(bodiesSent('PATCH')).toEqual([{ isCompleted: true }, { isCompleted: false }]);
    });
  });

  describe('deleting', () => {
    it('removes a to-do once the delete is confirmed', async () => {
      renderApp([buildTodo({ title: 'Buy milk' })]);
      await screen.findByText('Buy milk');

      await deleteTodo('Buy milk');

      await waitFor(() => expect(screen.queryByText('Buy milk')).not.toBeInTheDocument());
    });

    it('asks first, and keeps the to-do when the user backs out', async () => {
      renderApp([buildTodo({ title: 'Buy milk' })]);
      await screen.findByText('Buy milk');

      await userEvent.click(screen.getByRole('button', { name: 'Delete Buy milk' }));
      expect(vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);

      await userEvent.click(screen.getByRole('button', { name: 'Keep Buy milk' }));

      expect(screen.getByText('Buy milk')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete Buy milk' })).toBeInTheDocument();
    });
  });

  describe('owner', () => {
    it('sends the owner header with every request', async () => {
      renderApp([buildTodo({ title: 'Buy milk' })]);
      await screen.findByText('Buy milk');

      const calls = vi.mocked(fetch).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      for (const [, init] of calls) {
        expect((init?.headers as Record<string, string>)['X-Owner-Id']).toBeTruthy();
      }
    });
  });

  describe('while a write is in flight', () => {
    it('marks the row busy and refuses further clicks until it lands', async () => {
      let release!: () => void;
      const inFlight = new Promise<void>((resolve) => (release = resolve));
      renderApp([buildTodo({ title: 'Buy milk' })], { hold: inFlight });
      await screen.findByText('Buy milk');

      await deleteTodo('Buy milk');

      const row = rowFor('Buy milk');
      await waitFor(() => expect(row).toHaveAttribute('aria-busy', 'true'));
      expect(within(row).getByRole('checkbox')).toBeDisabled();
      expect(within(row).getByRole('button', { name: 'Confirm delete Buy milk' })).toBeDisabled();

      release();
      await waitFor(() => expect(screen.queryByText('Buy milk')).not.toBeInTheDocument());
    });

    it('marks every row with a write outstanding, not just the latest', async () => {
      let release!: () => void;
      const inFlight = new Promise<void>((resolve) => (release = resolve));
      renderApp(
        [buildTodo({ id: 'a', title: 'Buy milk' }), buildTodo({ id: 'b', title: 'Write README' })],
        { hold: inFlight },
      );
      await screen.findByText('Buy milk');

      await userEvent.click(within(rowFor('Buy milk')).getByRole('checkbox'));
      await userEvent.click(within(rowFor('Write README')).getByRole('checkbox'));

      await waitFor(() => expect(rowFor('Write README')).toHaveAttribute('aria-busy', 'true'));
      expect(rowFor('Buy milk')).toHaveAttribute('aria-busy', 'true');

      release();
      await waitFor(() => expect(rowFor('Buy milk')).toHaveAttribute('aria-busy', 'false'));
      expect(rowFor('Write README')).toHaveAttribute('aria-busy', 'false');
    });
  });

  describe('when a write fails', () => {
    it('reports the failure but keeps the list, so the user can try again', async () => {
      renderApp([buildTodo({ title: 'Buy milk' })], { failWrites: 1 });
      await screen.findByText('Buy milk');

      await deleteTodo('Buy milk');

      expect(await screen.findByRole('alert')).toHaveTextContent(WRITE_FAILURE_MESSAGE);
      expect(screen.getByText('Buy milk')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Confirm delete Buy milk' }));

      await waitFor(() => expect(screen.queryByText('Buy milk')).not.toBeInTheDocument());
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('keeps the editor open with the draft when a save fails', async () => {
      renderApp([buildTodo({ title: 'Buy milk' })], { failWrites: 1 });
      await screen.findByText('Buy milk');

      await userEvent.click(screen.getByRole('button', { name: 'Edit Buy milk' }));
      const title = screen.getByLabelText('Title');
      await userEvent.clear(title);
      await userEvent.type(title, 'Buy oat milk');
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(WRITE_FAILURE_MESSAGE);
      expect(screen.getByLabelText('Title')).toHaveValue('Buy oat milk');
    });

    it('keeps the new to-do draft when adding fails', async () => {
      renderApp([], { failWrites: 1 });
      await screen.findByText('Nothing to do yet.');

      await userEvent.type(screen.getByPlaceholderText('What needs doing?'), 'Buy milk');
      await userEvent.click(screen.getByRole('button', { name: 'Add' }));

      expect(await screen.findByText(WRITE_FAILURE_MESSAGE)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('What needs doing?')).toHaveValue('Buy milk');
    });
  });

  describe('searching', () => {
    it('shows only the to-dos matching the search', async () => {
      renderApp([
        buildTodo({ id: 'a', title: 'Buy milk' }),
        buildTodo({ id: 'b', title: 'Write README' }),
      ]);
      await screen.findByText('Buy milk');

      await userEvent.type(screen.getByLabelText('Search to-dos'), 'milk');

      await waitFor(() => expect(screen.queryByText('Write README')).not.toBeInTheDocument());
      expect(screen.getByText('Buy milk')).toBeInTheDocument();
    });

    it('explains an empty result rather than looking like an empty app', async () => {
      renderApp([buildTodo({ title: 'Buy milk' })]);
      await screen.findByText('Buy milk');

      await userEvent.type(screen.getByLabelText('Search to-dos'), 'bicycle');

      expect(await screen.findByText('No to-dos match "bicycle".')).toBeInTheDocument();
    });

    it('restores the full list when the search is cleared', async () => {
      renderApp([
        buildTodo({ id: 'a', title: 'Buy milk' }),
        buildTodo({ id: 'b', title: 'Write README' }),
      ]);
      await screen.findByText('Buy milk');

      await userEvent.type(screen.getByLabelText('Search to-dos'), 'milk');
      await waitFor(() => expect(screen.queryByText('Write README')).not.toBeInTheDocument());

      await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));

      expect(await screen.findByText('Write README')).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('asks the server for only the completed to-dos', async () => {
      renderApp([
        buildTodo({ id: 'a', title: 'Done thing', isCompleted: true }),
        buildTodo({ id: 'b', title: 'Pending thing' }),
      ]);
      await screen.findByText('Done thing');

      await userEvent.click(screen.getByRole('button', { name: 'Completed' }));

      await waitFor(() => expect(screen.queryByText('Pending thing')).not.toBeInTheDocument());
      expect(screen.getByText('Done thing')).toBeInTheDocument();
    });

    it.each([
      ['Incomplete', { isCompleted: 'false', overdue: null }],
      ['Completed', { isCompleted: 'true', overdue: null }],
      ['Overdue', { isCompleted: null, overdue: 'true' }],
    ])('sends %s as the matching API filter', async (button, expected) => {
      renderApp();
      await screen.findByText('Buy milk');

      await userEvent.click(screen.getByRole('button', { name: button }));

      await waitFor(() => expect(lastListQuery().get('isCompleted')).toBe(expected.isCompleted));
      expect(lastListQuery().get('overdue')).toBe(expected.overdue);
    });

    it('sends no filter for All', async () => {
      renderApp();
      await screen.findByText('Buy milk');
      await userEvent.click(screen.getByRole('button', { name: 'Completed' }));
      await waitFor(() => expect(lastListQuery().get('isCompleted')).toBe('true'));

      await userEvent.click(screen.getByRole('button', { name: 'All' }));

      await waitFor(() => expect(lastListQuery().has('isCompleted')).toBe(false));
      expect(lastListQuery().has('overdue')).toBe(false);
    });
  });

  describe('sorting', () => {
    it('asks the server for the chosen sort field and order', async () => {
      renderApp([buildTodo({ title: 'Buy milk' })]);
      await screen.findByText('Buy milk');

      await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'Title');
      await waitFor(() => expect(lastListQuery().get('sortBy')).toBe('title'));

      await userEvent.click(screen.getByRole('button', { name: /Sorted ascending/ }));
      await waitFor(() => expect(lastListQuery().get('order')).toBe('desc'));
      expect(lastListQuery().get('sortBy')).toBe('title');
      expect(screen.getByRole('button', { name: /Sorted descending/ })).toBeInTheDocument();
    });
  });

  describe('paging', () => {
    const tasks = (count: number) =>
      Array.from({ length: count }, (_, index) =>
        buildTodo({ id: `todo-${index + 1}`, title: `Task ${index + 1}` }),
      );

    it('shows ten to-dos a page and moves between pages', async () => {
      renderApp(tasks(12));
      await screen.findByText('Task 1');

      expect(screen.getByText('Task 10')).toBeInTheDocument();
      expect(screen.queryByText('Task 11')).not.toBeInTheDocument();
      expect(await screen.findByText('12 to-dos')).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

      await userEvent.click(screen.getByRole('button', { name: 'Next' }));

      expect(await screen.findByText('Task 11')).toBeInTheDocument();
      expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

      await userEvent.click(screen.getByRole('button', { name: 'Previous' }));

      expect(await screen.findByText('Task 1')).toBeInTheDocument();
    });

    it('hides the pager when everything fits on one page', async () => {
      renderApp(tasks(3));
      await screen.findByText('Task 1');

      expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument();
    });

    it('goes back to the first page when the filter changes', async () => {
      renderApp(tasks(12));
      await screen.findByText('Task 1');
      await userEvent.click(screen.getByRole('button', { name: 'Next' }));
      await screen.findByText('Task 11');

      await userEvent.click(screen.getByRole('button', { name: 'Incomplete' }));

      await waitFor(() => expect(lastListQuery().get('offset')).toBe('0'));
      expect(await screen.findByText('Task 1')).toBeInTheDocument();
    });

    it('steps back a page when a delete empties the last one', async () => {
      renderApp(tasks(11));
      await screen.findByText('Task 1');
      await userEvent.click(screen.getByRole('button', { name: 'Next' }));
      await screen.findByText('Task 11');

      await deleteTodo('Task 11');

      expect(await screen.findByText('Task 1')).toBeInTheDocument();
      expect(await screen.findByText('10 to-dos')).toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument();
    });
  });
});
