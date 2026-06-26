import { StrategyDetails } from '@/hooks/useStrategiesInfo';
import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

// Computed strategy details keyed by id. Written by useStrategiesInfo, read by
// the home grid / deposit / harvest / tx components.
//
// Replaces the old redux `strategySlice` — it only ever mirrored data that is
// already derived from Jotai atoms in useStrategiesInfo, so keeping it in Jotai
// removes a whole state library and the dispatch-in-effect bridge.
export const strategiesInfoAtom = atom<Record<string, StrategyDetails>>({});

// Stable per-id atom. atomFamily memoises by id, so each id keeps the same atom
// reference across renders (replaces selectStrategy).
export const strategyByIdAtom = atomFamily((id: string) =>
  atom((get) => get(strategiesInfoAtom)[id]),
);

// Derived array — Jotai memoises the computed value while the map is unchanged
// (replaces the createSelector-memoised selectAllStrategiesAsArray).
export const allStrategiesAtom = atom((get) =>
  Object.values(get(strategiesInfoAtom)),
);
