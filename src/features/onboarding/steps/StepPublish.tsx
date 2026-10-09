import { Check, Copy, ExternalLink, PartyPopper } from 'lucide-react'
import { useState } from 'react'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Alert, Badge } from '@/components/ui/Feedback'
import { useProducts } from '@/features/catalog/hooks'
import { useUpdateStore } from '@/features/stores/hooks'
import { storePublicUrl } from '@/features/stores/storeUrl'
import { useCopy } from '@/hooks/useCopy'
import { errorMessage } from '@/lib/errors'
import { formatCents } from '@/lib/format'
import { FULFILLMENT_LABEL, PAYMENT_LABEL } from '@/lib/labels'
import { formatPhone } from '@/lib/phone'
import type { StoreRow } from '@/types/database'

export function StepPublish({ store }: { store: StoreRow }) {
  const update = useUpdateStore()
  const products = useProducts(store.id)
  const { copied, copy } = useCopy()
  const [formError, setFormError] = useState<string | null>(null)
  const url = storePublicUrl(store.slug)
  const published = store.is_published && store.onboarding_completed_at
  const activeProducts = (products.data ?? []).filter((p) => p.is_active)

  const publish = async () => {
    setFormError(null)
    try {
      await update.mutateAsync({
        storeId: store.id,
        values: { is_published: true, is_open: true, onboarding_step: 5, onboarding_completed_at: new Date().toISOString() },
      })
    } catch (error) {
      setFormError(errorMessage(error))
    }
  }

  if (published) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-success-50 text-success-700">
          <PartyPopper className="size-7" aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-bold">Seu cardápio está no ar!</h1>
          <p className="mt-1 text-sm text-muted">Compartilhe o link no WhatsApp, Instagram e com seus clientes.</p>
        </div>
        <div className="flex w-full max-w-lg items-center gap-2 rounded-xl border border-line bg-canvas p-2 pl-4">
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">{url}</span>
          <Button size="sm" onClick={() => void copy(url)} icon={copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}>
            {copied ? 'Copiado' : 'Copiar link'}
          </Button>
        </div>
        <span aria-live="polite" className="sr-only">{copied ? 'Link copiado' : ''}</span>
        <div className="flex flex-wrap justify-center gap-2">
          <ButtonLink to="/app" size="lg">Ir para o painel</ButtonLink>
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-line px-5 font-semibold hover:bg-brand-50">
            <ExternalLink className="size-4" aria-hidden /> Abrir cardápio
          </a>
        </div>
      </div>
    )
  }

  const fulfillment = [store.accepts_delivery && FULFILLMENT_LABEL.delivery, store.accepts_pickup && FULFILLMENT_LABEL.pickup].filter(Boolean).join(' e ')

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">Confira e publique seu cardápio</h1>
        <p className="mt-1 text-sm text-muted">Ao publicar, sua loja fica aberta para pedidos. Você pode fechar a qualquer momento.</p>
      </div>
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      {!store.whatsapp ? (
        <Alert tone="warning" title="Falta o WhatsApp">
          Volte à etapa de atendimento para informar o número que vai receber os pedidos.
        </Alert>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-line">
        <div className="bg-brand-100 px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-bold">{store.name}</p>
            <Badge tone="success">Aberto</Badge>
          </div>
          <p className="text-sm text-ink-soft">{fulfillment}{store.whatsapp ? ` • WhatsApp ${formatPhone(store.whatsapp)}` : ''}</p>
        </div>
        <ul className="divide-y divide-line">
          {activeProducts.length === 0 ? (
            <li className="px-5 py-4 text-sm text-muted">Nenhum produto cadastrado ainda.</li>
          ) : (
            activeProducts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  {p.description ? <p className="truncate text-xs text-muted">{p.description}</p> : null}
                </div>
                <span className="text-sm font-semibold">{formatCents(p.price_cents)}</span>
              </li>
            ))
          )}
        </ul>
        <div className="border-t border-line bg-canvas px-5 py-3 text-xs text-muted">
          Pagamentos: {store.payment_methods.map((m) => PAYMENT_LABEL[m]).join(', ')}
          {store.accepts_delivery ? ` • Entrega: ${store.delivery_fee_cents ? formatCents(store.delivery_fee_cents) : 'grátis'}` : ''}
        </div>
      </div>

      <a href={`/loja/${store.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 self-start text-sm font-semibold text-brand-700 hover:underline">
        <ExternalLink className="size-4" aria-hidden /> Ver prévia completa como cliente
      </a>

      <div className="flex flex-col-reverse items-center gap-3 border-t border-line pt-5 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={() => void update.mutateAsync({ storeId: store.id, values: { onboarding_step: 2 } })}
          className="text-sm font-medium text-muted hover:text-ink"
        >
          Voltar e ajustar atendimento
        </button>
        <Button size="lg" onClick={() => void publish()} loading={update.isPending} disabled={!store.whatsapp} className="w-full sm:w-auto">
          Publicar cardápio
        </Button>
      </div>
    </div>
  )
}
