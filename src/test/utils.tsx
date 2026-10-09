import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { ToastProvider } from '@/components/ui/toast'
import { AuthTestProvider } from '@/features/auth/AuthProvider'

export function renderWithProviders(
  ui: ReactElement,
  { route = '/', path = '/', extraRoutes = [], user = null }: { route?: string; path?: string; extraRoutes?: RouteObject[]; user?: { id: string; email?: string } | null } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const router = createMemoryRouter([{ path, element: ui }, ...extraRoutes], { initialEntries: [route] })
  const result = render(
    <QueryClientProvider client={queryClient}>
      <AuthTestProvider value={{ user: user as never }}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthTestProvider>
    </QueryClientProvider>,
  )
  return { ...result, router, queryClient }
}
