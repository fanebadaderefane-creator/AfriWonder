import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false;
        const status = error?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return true;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      staleTime: 60 * 1000,
    },
    mutations: {
      retry: false,
    },
  },
});