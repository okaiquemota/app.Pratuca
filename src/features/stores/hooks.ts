import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthProvider'
import { queryKeys } from '@/lib/queryClient'
import type { StoreRow, StoreUpdate } from '@/types/database'
import { fetchMyStore, fetchStoreAccess, fetchSubscription, updateStore } from './api'

export function useMyStore() {
  const { user } = useAuth()
  return useQuery({ queryKey: queryKeys.store, queryFn: fetchMyStore, enabled: Boolean(user) })
}

/** Loja garantida (use apenas dentro de rotas protegidas por RequireStore). */
export function useStore(): StoreRow {
  const { data } = useMyStore()
  if (!data) throw new Error('useStore usado fora de RequireStore')
  return data
}

export function useSubscription(storeId: string) {
  return useQuery({ queryKey: queryKeys.subscription(storeId), queryFn: () => fetchSubscription(storeId) })
}

export function useStoreAccess(storeId: string) {
  return useQuery({ queryKey: queryKeys.access(storeId), queryFn: () => fetchStoreAccess(storeId) })
}

export function useUpdateStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ storeId, values }: { storeId: string; values: StoreUpdate }) => updateStore(storeId, values),
    onSuccess: (store) => {
      queryClient.setQueryData(queryKeys.store, store)
      void queryClient.invalidateQueries({ queryKey: queryKeys.publicMenu(store.slug) })
    },
  })
}
