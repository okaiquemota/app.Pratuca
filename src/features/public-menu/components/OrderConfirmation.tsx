import { CheckCircle2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert, Card } from '@/components/ui/Feedback'
import { waMeLinkNotifier } from '@/features/whatsapp/notifier'
import { formatCents, formatOrderNumber } from '@/lib/format'
import { FULFILLMENT_LABEL, PAYMENT_LABEL } from '@/lib/labels'
import type { PlacedOrder } from '../types'

/**
 * Confirmação: o pedido JÁ está registrado no sistema. Abrir o WhatsApp é
 * uma etapa separada e opcional — não afirmamos entrega nem leitura.
 */
export function OrderConfirmation({ order, customerPhone, onNewOrder }: { order: PlacedOrder; customerPhone: string; onNewOrder: () => void }) {
  const notify = waMeLinkNotifier.prepare(order, customerPhone)

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 py-8">
      <title>{`Pedido ${formatOrderNumber(order.number)} registrado — ${order.store.name}`}</title>
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-success-50 text-success-600">
          <CheckCircle2 className="size-8" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold" tabIndex={-1} ref={(el) => el?.focus()}>
          Pedido {formatOrderNumber(order.number)} registrado
        </h1>
        <p className="text-sm text-muted">
          {order.store.name} já pode ver seu pedido no painel. Guarde o número {formatOrderNumber(order.number)} caso precise falar com a loja.
        </p>
      </div>

      {notify.kind === 'link' ? (
        <Card className="flex flex-col gap-3 p-5">
          <p className="font-semibold">Quer avisar a loja pelo WhatsApp?</p>
          <p className="text-sm text-muted">
            Vamos abrir o WhatsApp com o resumo do pedido já escrito. Você só precisa tocar em enviar. Essa etapa é opcional: seu pedido já está
            registrado mesmo que você não envie a mensagem.
          </p>
          <a
            href={notify.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-success-600 px-5 font-semibold text-white hover:bg-success-700"
          >
            <MessageCircle className="size-5" aria-hidden /> Enviar resumo pelo WhatsApp
          </a>
        </Card>
      ) : (
        <Alert tone="info">A loja receberá seu pedido pelo painel da Pratuca.</Alert>
      )}

      {order.duplicate ? (
        <Alert tone="info">Este pedido já tinha sido registrado. Não criamos um pedido duplicado.</Alert>
      ) : null}

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Resumo</h2>
        <ul className="space-y-2 text-sm">
          {order.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>
                {item.quantity}x {item.product_name}
                {item.options.length ? <span className="block text-xs text-muted">{item.options.map((o) => o.name).join(', ')}</span> : null}
              </span>
              <span className="tabular-nums">{formatCents(item.line_total_cents)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
          {order.fulfillment === 'delivery' ? (
            <div className="flex justify-between"><dt className="text-muted">Entrega</dt><dd>{order.delivery_fee_cents ? formatCents(order.delivery_fee_cents) : 'Grátis'}</dd></div>
          ) : null}
          <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{formatCents(order.total_cents)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">{FULFILLMENT_LABEL[order.fulfillment]}</dt><dd>{PAYMENT_LABEL[order.payment_method]}</dd></div>
        </dl>
      </Card>

      <Button variant="outline" onClick={onNewOrder}>
        Fazer outro pedido
      </Button>
    </div>
  )
}
