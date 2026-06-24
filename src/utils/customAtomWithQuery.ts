// Result type returned by custom query atoms
export type CustomAtomWithQueryResult<TData, TError> = {
  data: TData | null;
  error: TError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: () => void;
};
