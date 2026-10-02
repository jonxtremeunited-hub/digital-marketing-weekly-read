import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';

import { store } from './reducers';

vi.mock('ryuu.js', () => ({
  default: {
    env: { userId: '1234567890' },
    get: vi.fn().mockResolvedValue({
      id: '1234567890',
      displayName: 'Test User',
      emailAddress: 'test@example.com',
    }),
    post: vi.fn().mockResolvedValue({ content: [{ type: 'TEXT', text: 'hi' }] }),
    codeEngine: vi.fn().mockResolvedValue([]),
    onDataUpdate: vi.fn(),
  },
}));

const { App } = await import('./App');

function renderApp(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <Provider store={store}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </Provider>,
  );
}

describe('App', () => {
  it('renders the hero and the snacks grid', () => {
    renderApp(<App />);
    expect(screen.getByText(/You just made a Domo app/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Snacks' })).toBeInTheDocument();
    expect(screen.getByText('snacks/chatbot')).toBeInTheDocument();
    expect(screen.getByText('snacks/smart-link')).toBeInTheDocument();
    expect(screen.getByText('snacks/user-info')).toBeInTheDocument();
    expect(screen.getByText('snacks/dataset-refresh-banner')).toBeInTheDocument();
  });

  it('renders the note-cards section with file structure and tech stack', () => {
    renderApp(<App />);
    expect(screen.getByRole('heading', { level: 2, name: 'Note cards' })).toBeInTheDocument();
    expect(screen.getByText('File structure')).toBeInTheDocument();
    expect(screen.getByText('Tech stack')).toBeInTheDocument();
    expect(screen.getAllByText('src/App.tsx').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vite 6').length).toBeGreaterThan(0);
  });

  it('greets the user by first name once the user query resolves', async () => {
    renderApp(<App />);
    await waitFor(() => expect(screen.getByText(/Welcome, Test/)).toBeInTheDocument());
  });
});
