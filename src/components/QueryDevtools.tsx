'use client';

import { lazy, Suspense } from 'react';
import { queryClient } from '@/utils/queryClient';

// React Query DevTools — DEV ONLY.
//
// Two wrinkles handled here:
//  1. Our query client lives in a Jotai atom (queryClientAtom on MY_STORE), not
//     a React `QueryClientProvider`, so the devtools can't read it from context
//     — we pass our shared `queryClient` explicitly via the `client` prop.
//  2. The repo resolves two @tanstack/query-core versions (ours is 5.28.0; the
//     devtools' react-query peer pulls 5.90.x), so the `QueryClient` types don't
//     line up nominally. The devtools only call stable 5.x cache APIs at runtime,
//     so the cast is safe.
//
// The dev-only `lazy` import sits in a branch that is statically false in
// production, so the devtools bundle is tree-shaken out of prod builds.
const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? lazy(() =>
        import('@tanstack/react-query-devtools').then((m) => ({
          default: m.ReactQueryDevtools,
        })),
      )
    : null;

export default function QueryDevtools() {
  if (!ReactQueryDevtools) return null;
  return (
    <Suspense fallback={null}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ReactQueryDevtools client={queryClient as any} initialIsOpen={false} />
    </Suspense>
  );
}
