import { QueryClient } from '@tanstack/query-core';

// Single shared QueryClient for every `atomWithQuery` (wired into MY_STORE via
// jotai-tanstack-query's `queryClientAtom` in src/store/index.ts).
//
// Defaults matter here: without them jotai-tanstack-query falls back to stock
// TanStack defaults (staleTime 0 + refetchOnWindowFocus true), which made the
// app refetch *everything* on every tab focus. We drive freshness off events
// instead (mount, account change, tx confirmation — see queryClient
// invalidation in transactions.atom.ts), so the global config is deliberately
// quiet:
//   - staleTime 60s: don't refetch data we fetched seconds ago
//   - no refetch on window focus: focusing the tab shouldn't re-hit the chain
//   - refetchIntervalInBackground false: pollers pause when the tab is hidden
//   - retry 1: fail fast instead of hammering a failing endpoint
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      refetchIntervalInBackground: false,
      retry: 1,
    },
  },
});
