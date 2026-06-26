import { createStore } from 'jotai';
import { queryClientAtom } from 'jotai-tanstack-query';
import { queryClient } from '@/utils/queryClient';

export const MY_STORE = createStore();

// Make every atomWithQuery use our configured client (staleTime / no
// focus-refetch / event-driven invalidation) instead of the library's stock
// default. Set at module init, before any query atom is mounted.
MY_STORE.set(queryClientAtom, queryClient);
