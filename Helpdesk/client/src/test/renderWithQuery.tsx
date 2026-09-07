import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Creates an isolated QueryClient instance configured for unit tests.
 * Retries and garbage collection timeouts are disabled to ensure deterministic assertions.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export interface RenderWithQueryOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export interface RenderWithQueryResult extends RenderResult {
  queryClient: QueryClient;
}

/**
 * Custom render helper that wraps the component with a TanStack QueryClientProvider.
 * Returns standard React Testing Library render result along with the test QueryClient instance.
 */
export function renderWithQuery(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: RenderWithQueryOptions = {}
): RenderWithQueryResult {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

// Backward-compatible alias
export const renderWithProviders = renderWithQuery;
