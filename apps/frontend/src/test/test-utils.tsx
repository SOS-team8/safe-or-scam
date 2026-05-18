import type { ReactNode } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

type ProviderOptions = {
  queryClient?: QueryClient
  routerInitialEntries?: string[]
}

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

export const createWrapper = (options: ProviderOptions = {}) => {
  const queryClient = options.queryClient ?? createTestQueryClient()
  const initialEntries = options.routerInitialEntries ?? ['/']

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    </QueryClientProvider>
  )

  return { Wrapper, queryClient }
}
