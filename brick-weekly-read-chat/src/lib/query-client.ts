// TanStack Query client — server-state caching, deduplication, background refetch.
// Wraps every apiProxy call so components consume `useQuery({ queryKey, queryFn })`
// instead of re-implementing loading/error tracking per component.
//
// Defaults are conservative for Domo work:
//   - staleTime: 5 minutes — Domo data changes via Dataflow runs, not user clicks
//   - retry: 1 — apiProxy errors are usually deterministic (auth, manifest), not transient
//   - refetchOnWindowFocus: false — Domo iframes are often opened once and left open
// Override per-query via the `useQuery` options when these defaults don't fit.

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
