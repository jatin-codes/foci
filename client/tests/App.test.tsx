import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTodo, fakeApi } from './support/fakeApi.js';
import { renderApp } from './support/renderApp.js';

/** The row containing a to-do, so assertions do not leak into its neighbours. */
function rowFor(title: string) {
  return screen.getByText(title).closest('li')!;
}

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fakeApi());
  });

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
    it('saves an edited title and due date', async () => {
      renderApp([buildTodo({ title: 'Buy milk' })]);
      await screen.findByText('Buy milk');

      await userEvent.click(screen.getByRole('button', { name: 'Edit Buy milk' }));
      const title = screen.getByLabelText('Title');
      await userEvent.clear(title);
      await userEvent.type(title, 'Buy oat milk');
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(await screen.findByText('Buy oat milk')).toBeInTheDocument();
      expect(screen.queryByText('Buy milk')).not.toBeInTheDocument();
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
    });
  });

  describe('deleting', () => {
    it('removes a to-do', async () => {
      renderApp([buildTodo({ title: 'Buy milk' })]);
      await screen.findByText('Buy milk');

      await userEvent.click(screen.getByRole('button', { name: 'Delete Buy milk' }));

      await waitFor(() => expect(screen.queryByText('Buy milk')).not.toBeInTheDocument());
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
      renderApp([buildTodo({ title: 'Buy milk' })], inFlight);
      await screen.findByText('Buy milk');

      await userEvent.click(screen.getByRole('button', { name: 'Delete Buy milk' }));

      const row = rowFor('Buy milk');
      await waitFor(() => expect(row).toHaveAttribute('aria-busy', 'true'));
      expect(within(row).getByRole('checkbox')).toBeDisabled();
      expect(within(row).getByRole('button', { name: 'Delete Buy milk' })).toBeDisabled();

      release();
      await waitFor(() => expect(screen.queryByText('Buy milk')).not.toBeInTheDocument());
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
  });
});
