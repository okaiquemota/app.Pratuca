import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryClient'
import { fetchCategories, fetchDailyMenu, fetchOptionGroups, fetchProducts } from './api'

export function useCategories(storeId: string) {
  return useQuery({ queryKey: queryKeys.categories(storeId), queryFn: () => fetchCategories(storeId) })
}

export function useProducts(storeId: string) {
  return useQuery({ queryKey: queryKeys.products(storeId), queryFn: () => fetchProducts(storeId) })
}

export function useOptionGroups(productId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.optionGroups(productId ?? 'new'),
    queryFn: () => fetchOptionGroups(productId!),
    enabled: Boolean(productId),
  })
}

export function useDailyMenu(storeId: string, date: string) {
  // Sem refetch automático: evita descartar edições em andamento do editor.
  return useQuery({
    queryKey: queryKeys.dailyMenu(storeId, date),
    queryFn: () => fetchDailyMenu(storeId, date),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}
