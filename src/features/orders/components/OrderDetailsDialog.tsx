import { MapPin, MessageCircle, Phone } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog'
import { Alert } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/toast'
import { buildWaMeLink } from '@/features/whatsapp/link'
import { errorMessage } from '@/lib/errors'
import { formatCents, formatDateTime, formatOrderNumber } from '@/lib/format'
import { FULFILLMENT_LABEL, PAYMENT_LABEL } from '@/lib/labels'
import { formatPhone, toWhatsappNumber } from '@/lib/phone'
import type { DeliveryAddress, OrderItemOptionSnapshot, OrderStatus } from '@/types/database'
import type { OrderWithItems } from '../api'
import { useOrderHistory, useUpdateOrderStatus } from '../hooks'
import { availableTransitions, nextStatus, STATUS_ACTION, STATUS_LABEL } from '../status'
import { OrderStatusBadge } from './OrderStatusBadge'

interface Props {
  order: OrderWithItems
  timeZone: string
  onClose: () => void
}

export function OrderDetailsDialog({ order, timeZone, onClose }: Props) {
  const update = useUpdateOrderStatus(order.store_id)
  const history = useOrderHistory(order.id)
  const toast = useToast()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const next = nextStatus(order.status, order.fulfillment)
  const others = availableTransitions(order.status, order.fulfillment).filter((s) => s !== next && s !== 'canceled')
  const canCancel = availableTransitions(order.status, order.fulfillment).includes('canceled')
  const address = order.delivery_address as DeliveryAddress | null
  const customerWhatsapp = order.customer_phone ? toWhatsappNumber(order.customer_phone) : null

  const change = async (status: OrderStatus) => {
    setError(null)
    try {
      await update.mutateAsync({ orderId: order.id, status })
      toast.success(`Pedido ${formatOrderNumber(order.number)}: ${STATUS_LABEL[status].toLowerCase()}.`)
      setConfirmCancel(false)
      if (status === 'completed' || status === 'canceled') onClose()
    } catch (e) {
      setError(errorMessage(e))
      setConfirmCancel(false)
    }
  }

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        title={`Pedido ${formatOrderNumber(order.number)}`}
        description={formatDateTime(order.created_at, timeZone)}
        size="lg"
        footer={
          <>
            {canCancel ? (
              <Button variant="danger-ghost" className="sm:mr-auto" onClick={() => setConfirmCancel(true)} disabled={update.isPending}>
                Cancelar pedido
              </Button>
            ) : null}
            {next ? (
              <Button onClick={() => void change(next)} loading={update.isPending}>
                {STATUS_ACTION[next]}
              </Button>
            ) : (
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <span className="rounded-full bg-canvas px-2.5 py-0.5 text-xs font-semibold">{FULFILLMENT_LABEL[order.fulfillment]}</span>
          </div>

          {others.length ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">Pular para:</span>
              {others.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => void change(s)} disabled={update.isPending}>
                  {STATUS_LABEL[s]}
                </Button>
              ))}
            </div>
          ) : null}

          <section aria-labelledby="cliente" className="rounded-xl bg-canvas p-4">
            <h3 id="cliente" className="text-xs font-semibold tracking-wide text-muted uppercase">Cliente</h3>
            <p className="mt-1 font-semibold">{order.customer_name}</p>
            {order.customer_phone ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={`tel:${order.customer_phone}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm hover:bg-brand-50">
                  <Phone className="size-4" aria-hidden /> {formatPhone(order.customer_phone)}
                </a>
                {customerWhatsapp ? (
                  <a
                    href={buildWaMeLink(customerWhatsapp, `Olá, ${order.customer_name}! Sobre seu pedido ${formatOrderNumber(order.number)}:`) ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm hover:bg-brand-50"
                  >
                    <MessageCircle className="size-4" aria-hidden /> Conversar no WhatsApp
                  </a>
                ) : null}
              </div>
            ) : null}
            {order.fulfillment === 'delivery' && address ? (
              <p className="mt-3 flex gap-2 text-sm">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                <span>
                  {[address.street, address.number].filter(Boolean).join(', ')}
                  {address.complement ? ` — ${address.complement}` : ''}
                  {address.neighborhood ? <><br />{address.neighborhood}</> : null}
                  {address.reference ? <><br /><span className="text-muted">Ref.: {address.reference}</span></> : null}
                </span>
              </p>
            ) : null}
          </section>

          <section aria-labelledby="itens">
            <h3 id="itens" className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Itens</h3>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {order.order_items.map((item) => {
                const options = (Array.isArray(item.options) ? item.options : []) as OrderItemOptionSnapshot[]
                return (
                  <li key={item.id} className="flex justify-between gap-4 px-4 py-3 text-sm">
                    <div>
                      <p className="font-semibold">
                        {item.quantity}x {item.product_name}
                      </p>
                      {options.map((o) => (
                        <p key={`${o.group_name}-${o.name}`} className="text-muted">
                          {o.group_name}: {o.name}
                          {o.price_cents ? ` (+${formatCents(o.price_cents)})` : ''}
                        </p>
                      ))}
                      {item.notes ? <p className="mt-1 rounded bg-warning-50 px-2 py-0.5 text-warning-700">Obs.: {item.notes}</p> : null}
                    </div>
                    <span className="shrink-0 font-medium tabular-nums">{formatCents(item.line_total_cents)}</span>
                  </li>
                )
              })}
            </ul>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatCents(order.subtotal_cents)}</dd></div>
              {order.fulfillment === 'delivery' ? (
                <div className="flex justify-between"><dt className="text-muted">Taxa de entrega</dt><dd className="tabular-nums">{formatCents(order.delivery_fee_cents)}</dd></div>
              ) : null}
              <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{formatCents(order.total_cents)}</dd></div>
            </dl>
          </section>

          <section aria-labelledby="pagamento" className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <h3 id="pagamento" className="text-xs font-semibold tracking-wide text-muted uppercase">Pagamento</h3>
              <p className="mt-1">
                {PAYMENT_LABEL[order.payment_method]}
                {order.payment_method === 'cash' && order.change_for_cents ? ` — troco para ${formatCents(order.change_for_cents)}` : ''}
              </p>
            </div>
            {order.notes ? (
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Observações</h3>
                <p className="mt-1">{order.notes}</p>
              </div>
            ) : null}
          </section>

          {history.data?.length ? (
            <section aria-labelledby="historico">
              <h3 id="historico" className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Histórico</h3>
              <ol className="space-y-1 text-sm">
                {history.data.map((h) => (
                  <li key={h.id} className="flex justify-between gap-4">
                    <span>{STATUS_LABEL[h.to_status]}</span>
                    <span className="text-muted tabular-nums">{formatDateTime(h.created_at, timeZone)}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      </Dialog>
      <ConfirmDialog
        open={confirmCancel}
        title={`Cancelar o pedido ${formatOrderNumber(order.number)}?`}
        description="O pedido sai do resumo de produção e do total vendido. Essa ação não pode ser desfeita. Avise o cliente pelo WhatsApp."
        confirmLabel="Cancelar pedido"
        loading={update.isPending}
        onConfirm={() => void change('canceled')}
        onClose={() => setConfirmCancel(false)}
      />
    </>
  )
}
