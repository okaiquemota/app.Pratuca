import { QueryClient } from '@tanstack/react-query'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (count, error) => {
          const message = error instanceof Error ? error.message : ''
          if (/^[A-Z_]+$/.test(message) || /permission|JWT/i.test(message)) return false
          return count < 2
        },
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
    },
  })
}

export const queryKeys = {
  store: ['store'] as const,
  subscription: (storeId: string) => ['subscription', storeId] as const,
  access: (storeId: string) => ['access', storeId] as const,
  categories: (storeId: string) => ['categories', storeId] as const,
  products: (storeId: string) => ['products', storeId] as const,
  optionGroups: (productId: string) => ['option-groups', productId] as const,
  dailyMenu: (storeId: string, date: string) => ['daily-menu', storeId, date] as const,
  orders: (storeId: string, filters: unknown) => ['orders', storeId, filters] as const,
  ordersAll: (storeId: string) => ['orders', storeId] as const,
  order: (orderId: string) => ['order', orderId] as const,
  customers: (storeId: string, search: string) => ['customers', storeId, search] as const,
  publicMenu: (slug: string) => ['public-menu', slug] as const,
  plan: ['plan'] as const,
}
