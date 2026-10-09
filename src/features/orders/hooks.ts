import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryClient'
import type { OrderStatus } from '@/types/database'
import { fetchOrderHistory, fetchOrders, updateOrderStatus, type OrderFilters } from './api'

/** Pedidos atualizam sozinhos a cada 20 s (e ao voltar para a aba). */
export const ORDERS_REFRESH_MS = 20_000

export function useOrders(storeId: string, filters: OrderFilters) {
  return useQuery({
    queryKey: queryKeys.orders(storeId, filters),
    queryFn: () => fetchOrders(storeId, filters),
    refetchInterval: ORDERS_REFRESH_MS,
    placeholderData: keepPreviousData,
  })
}

export function useOrderHistory(orderId: string) {
  return useQuery({ queryKey: [...queryKeys.order(orderId), 'history'], queryFn: () => fetchOrderHistory(orderId) })
}

export function useUpdateOrderStatus(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) => updateOrderStatus(orderId, status),
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ordersAll(storeId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.order(variables.orderId) })
    },
  })
}
