import { configureStore } from '@reduxjs/toolkit';
import strategyReducer from './features/strategySlice';

export const store = configureStore({
  reducer: {
    strategy: strategyReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;
