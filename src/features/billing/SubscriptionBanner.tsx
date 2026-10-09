import { Link } from 'react-router'
import { useSubscription } from '@/features/stores/hooks'
import { formatDate } from '@/lib/format'
import { describeAccess } from './plan'

/** Aviso discreto sobre teste acabando ou acesso bloqueado. */
export function SubscriptionBanner({ storeId }: { storeId: string }) {
  const { data: subscription } = useSubscription(storeId)
  if (!subscription) return null
  const access = describeAccess(subscription)

  let text: string | null = null
  let tone = 'bg-brand-100 text-ink'
  if (access.kind === 'trial' && access.daysLeft <= 3) {
    text = `Seu teste termina em ${access.daysLeft} ${access.daysLeft === 1 ? 'dia' : 'dias'}.`
  } else if (access.kind === 'grace') {
    text = `Pagamento pendente. Sua loja continua recebendo pedidos até ${formatDate(access.until)}.`
    tone = 'bg-warning-50 text-warning-700'
  } else if (access.kind === 'blocked') {
    text = 'Sua loja não está recebendo pedidos pela internet. Seus dados continuam salvos.'
    tone = 'bg-danger-50 text-danger-600'
  }
  if (!text) return null

  return (
    <div role="status" className={`border-b border-line px-4 py-2.5 text-center text-sm ${tone}`}>
      {text}{' '}
      <Link to="/app/assinatura" className="font-semibold underline underline-offset-2">
        Ver assinatura
      </Link>
    </div>
  )
}
