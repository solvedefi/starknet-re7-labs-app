import { createSlice, PayloadAction } from '@reduxjs/toolkit';
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

export const strategySlice = createSlice({
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

export const { saveStrategy, removeStrategy } = strategySlice.actions;

// Selectors
export const selectStrategy = (state: RootState, id: string) =>
  state.strategy.strategies[id];
export const selectAllStrategies = (state: RootState) =>
  state.strategy.strategies;
export const selectAllStrategiesAsArray = (state: RootState) =>
  Object.values(state.strategy.strategies);

export default strategySlice.reducer;
