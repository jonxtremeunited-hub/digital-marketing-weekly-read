import './styles/globals.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import RyuuJS from 'ryuu.js';

import { App } from './App';
import { queryClient } from './lib/query-client';
import { store } from './reducers';

// Block ryuu's default auto-reload-on-dataset-update — we manage refetching via
// TanStack Query. Without this, any upstream dataset change re-mounts the app.
RyuuJS.onDataUpdate(() => null);

if (import.meta.env.DEV) {
  console.log(`${DOMO_APP_NAME}@${DOMO_APP_VERSION}`);
}

const root = document.getElementById('root');
if (!root) throw new Error('#root element not found in index.html');

// Provider order is intentional: Redux outermost (owned client state), TanStack
// Query inside (async remote state). The order doesn't matter at runtime — but
// reading top-to-bottom teaches the two-layer split in pantry's state-management
// model. See pantry/scaffold/app/template/CLAUDE.md "State management".
createRoot(root).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
);
