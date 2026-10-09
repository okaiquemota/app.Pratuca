import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Search, UserX, Users } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { Alert, Card, EmptyState, PageHeader, Skeleton } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/toast'
import { useStore } from '@/features/stores/hooks'
import { buildWaMeLink } from '@/features/whatsapp/link'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatNumber } from '@/lib/format'
import { formatPhone, toWhatsappNumber } from '@/lib/phone'
import { queryKeys } from '@/lib/queryClient'
import type { CustomerRow } from '@/types/database'
import { anonymizeCustomer, fetchCustomers } from './api'

export default function CustomersPage() {
  const store = useStore()
  const [search, setSearch] = useState('')
  const term = useDebouncedValue(search, 300)
  const customers = useQuery({ queryKey: queryKeys.customers(store.id, term), queryFn: () => fetchCustomers(store.id, term) })
  const queryClient = useQueryClient()
  const toast = useToast()
  const [removing, setRemoving] = useState<CustomerRow | null>(null)
  const [busy, setBusy] = useState(false)
  const list = customers.data ?? []

  const anonymize = async () => {
    if (!removing) return
    setBusy(true)
    try {
      await anonymizeCustomer(removing.id)
      await queryClient.invalidateQueries({ queryKey: ['customers', store.id] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.ordersAll(store.id) })
      toast.success('Dados pessoais do cliente removidos.')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
      setRemoving(null)
    }
  }

  return (
    <>
      <title>Clientes — Pratuca</title>
      <PageHeader title="Clientes" description="Registrados automaticamente a partir dos pedidos. Guardamos apenas nome e telefone." />

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <label htmlFor="busca-clientes" className="sr-only">Buscar por nome ou telefone</label>
        <Input id="busca-clientes" type="search" placeholder="Buscar por nome ou telefone" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {customers.isError ? <Alert tone="danger">{errorMessage(customers.error)}</Alert> : null}

      {customers.isPending ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" aria-hidden />}
          title={term ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda'}
          description={term ? 'Tente outro nome ou telefone.' : 'Quando alguém fizer um pedido pelo seu cardápio, aparece aqui.'}
        />
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {list.map((c) => {
              const wa = toWhatsappNumber(c.phone)
              return (
                <li key={c.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-sm text-muted">
                      {formatPhone(c.phone)} · {formatNumber(c.orders_count)} {c.orders_count === 1 ? 'pedido' : 'pedidos'}
                      {c.last_order_at ? ` · último em ${formatDate(c.last_order_at, store.timezone)}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {wa ? (
                      <a href={buildWaMeLink(wa) ?? '#'} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-semibold hover:bg-brand-50">
                        <MessageCircle className="size-4" aria-hidden /> WhatsApp
                      </a>
                    ) : null}
                    <Button variant="ghost" size="sm" icon={<UserX className="size-4" aria-hidden />} onClick={() => setRemoving(c)}>
                      Remover dados
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="Remover os dados pessoais deste cliente?"
        description="Use quando o cliente pedir a exclusão dos dados. Nome, telefone e endereços dos pedidos dele serão apagados; os pedidos continuam no histórico como “Cliente removido”. Não pode ser desfeito."
        confirmLabel="Remover dados"
        loading={busy}
        onConfirm={() => void anonymize()}
        onClose={() => setRemoving(null)}
      />
    </>
  )
}
