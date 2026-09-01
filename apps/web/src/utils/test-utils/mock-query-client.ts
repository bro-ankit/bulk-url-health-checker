import { QueryClient } from '@tanstack/react-query';

export const MOCK_QUERY_CLIENT = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
      gcTime: Infinity,
    },
  },
});
