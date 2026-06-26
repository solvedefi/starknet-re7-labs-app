import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { StrategyDetails } from '@/hooks/useStrategiesInfo';

interface Strategy extends StrategyDetails {
  id: string;
  // Add other strategy properties here
}

interface StrategyState {
  strategies: Record<string, Strategy>;
}

const initialState: StrategyState = {
  strategies: {},
};

const strategySlice = createSlice({
  name: 'strategy',
  initialState,
  reducers: {
    saveStrategy: (state, action: PayloadAction<Strategy>) => {
      state.strategies[action.payload.id] = action.payload;
    },
    removeStrategy: (state, action: PayloadAction<string>) => {
      delete state.strategies[action.payload];
    },
  },
});

export const { saveStrategy } = strategySlice.actions;

// Selectors
export const selectStrategy = (state: RootState, id: string) =>
  state.strategy.strategies[id];
// Memoized so the returned array keeps a stable reference while the strategies
// map is unchanged. Without this, react-redux + useSyncExternalStore re-renders
// on every call (new array each time), causing constant re-render/refetch churn.
export const selectAllStrategiesAsArray = createSelector(
  (state: RootState) => state.strategy.strategies,
  (strategies) => Object.values(strategies),
);

export default strategySlice.reducer;
