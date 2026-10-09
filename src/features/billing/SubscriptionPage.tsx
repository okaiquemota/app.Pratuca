import { useQuery } from '@tanstack/react-query'
import { CalendarClock, Check, CreditCard, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Alert, Badge, Card, PageHeader, Skeleton } from '@/components/ui/Feedback'
import { fetchActivePlan } from '@/features/stores/api'
import { useStore, useStoreAccess, useSubscription } from '@/features/stores/hooks'
import { env } from '@/lib/env'
import { errorMessage } from '@/lib/errors'
import { formatCents, formatDate } from '@/lib/format'
import { queryKeys } from '@/lib/queryClient'
import { describeAccess, GRACE_DAYS, LAUNCH_PLAN, SUBSCRIPTION_LABEL } from './plan'
import { billingGateway } from './provider'

const features = ['Cardápio digital com link próprio', 'Pedidos ilimitados, sem comissão', 'Resumo de produção do dia', 'Pedidos pelo WhatsApp', 'Cardápio do dia e adicionais']

export default function SubscriptionPage() {
  const store = useStore()
  const subscription = useSubscription(store.id)
  const access = useStoreAccess(store.id)
  const plan = useQuery({ queryKey: queryKeys.plan, queryFn: fetchActivePlan, staleTime: 3_600_000 })
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const priceCents = plan.data?.price_cents ?? LAUNCH_PLAN.priceCents
  const sub = subscription.data
  const state = sub ? describeAccess(sub) : null

  const startCheckout = async () => {
    setCheckoutError(null)
    setLoading(true)
    try {
      const { url } = await billingGateway.startCheckout(store.id)
      window.location.assign(url)
    } catch (error) {
      setCheckoutError(
        error instanceof Error && error.message === 'BILLING_NOT_CONFIGURED'
          ? 'O pagamento online ainda não está disponível. Fale com o suporte para ativar sua assinatura.'
          : errorMessage(error),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <title>Assinatura — Pratuca</title>
      <PageHeader title="Assinatura" description="Seu plano, situação e cobrança." />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card className="p-6">
          {subscription.isPending ? (
            <Skeleton className="h-32" />
          ) : subscription.isError ? (
            <Alert tone="danger">{errorMessage(subscription.error)}</Alert>
          ) : !sub || !state ? (
            <Alert tone="warning">Assinatura não encontrada. Fale com o suporte.</Alert>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold">Plano {plan.data?.name ?? LAUNCH_PLAN.name}</h2>
                <Badge tone={state.kind === 'blocked' ? 'danger' : state.kind === 'grace' ? 'warning' : state.kind === 'trial' ? 'brand' : 'success'}>
                  {SUBSCRIPTION_LABEL[sub.status]}
                </Badge>
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-canvas p-4">
                  <dt className="flex items-center gap-2 text-sm text-muted"><CreditCard className="size-4" aria-hidden /> Valor</dt>
                  <dd className="mt-1 text-lg font-bold">{formatCents(priceCents)}/mês</dd>
                </div>
                <div className="rounded-xl bg-canvas p-4">
                  <dt className="flex items-center gap-2 text-sm text-muted"><CalendarClock className="size-4" aria-hidden /> Situação</dt>
                  <dd className="mt-1 font-semibold">
                    {state.kind === 'trial' && `Teste até ${formatDate(state.endsAt)} (${state.daysLeft} ${state.daysLeft === 1 ? 'dia' : 'dias'})`}
                    {state.kind === 'active' && (state.renewsAt ? `Ativa até ${formatDate(state.renewsAt)}` : 'Ativa')}
                    {state.kind === 'grace' && `Pagamento pendente — carência até ${formatDate(state.until)}`}
                    {state.kind === 'ending' && `Cancelada — acesso até ${formatDate(state.until)}`}
                    {state.kind === 'blocked' && 'Recebimento de pedidos pausado'}
                  </dd>
                </div>
              </dl>

              {access.data === false ? (
                <Alert tone="warning" title="Sua loja não está recebendo pedidos">
                  O cardápio continua visível, mas novos pedidos estão bloqueados até a assinatura ser ativada. Nenhum dado foi apagado:
                  produtos, clientes e histórico de pedidos continuam salvos.
                </Alert>
              ) : null}

              {sub.status !== 'active' ? (
                <div className="flex flex-col gap-3">
                  {checkoutError ? <Alert tone="warning">{checkoutError}</Alert> : null}
                  {!billingGateway.configured ? (
                    <Alert tone="info" title="Pagamento online em configuração">
                      A cobrança recorrente ainda está sendo integrada. Durante o período de lançamento, a ativação é feita pelo suporte
                      {env.supportEmail ? <> em <a className="font-semibold underline" href={`mailto:${env.supportEmail}`}>{env.supportEmail}</a></> : null}.
                    </Alert>
                  ) : (
                    <Button size="lg" className="self-start" loading={loading} onClick={() => void startCheckout()}>
                      Assinar por {formatCents(priceCents)}/mês
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold">O que está incluído</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success-600" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex gap-2 rounded-xl bg-canvas p-3 text-xs text-muted">
            <ShieldCheck className="size-4 shrink-0 text-success-600" aria-hidden />
            <p>
              Se o pagamento atrasar, sua loja continua recebendo pedidos por {GRACE_DAYS} dias. Depois disso, apenas novos pedidos são pausados —
              seus dados nunca são apagados por inadimplência.
            </p>
          </div>
        </Card>
      </div>
    </>
  )
}
