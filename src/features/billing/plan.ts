import type { SubscriptionRow, SubscriptionStatus } from '@/types/database'

/** Plano de lançamento. O valor oficial vive na tabela public.plans. */
export const LAUNCH_PLAN = {
  code: 'essencial',
  name: 'Essencial',
  priceCents: 3990,
  trialDays: 7,
} as const

export const GRACE_DAYS = 3

export const SUBSCRIPTION_LABEL: Record<SubscriptionStatus, string> = {
  trialing: 'Período de teste',
  active: 'Ativa',
  past_due: 'Pagamento pendente',
  canceled: 'Cancelada',
  pending: 'Aguardando ativação',
}

export type AccessState =
  | { kind: 'trial'; daysLeft: number; endsAt: string }
  | { kind: 'active'; renewsAt: string | null }
  | { kind: 'grace'; until: string }
  | { kind: 'ending'; until: string }
  | { kind: 'blocked'; reason: 'trial_ended' | 'payment_overdue' | 'canceled' | 'pending' }

const DAY = 86_400_000

/**
 * Espelho (para exibição) de private.store_has_access. Quem decide se a
 * loja recebe pedidos é o banco — nunca este cálculo do navegador.
 */
export function describeAccess(sub: Pick<SubscriptionRow, 'status' | 'trial_ends_at' | 'current_period_end'>, now = new Date()): AccessState {
  const t = now.getTime()
  switch (sub.status) {
    case 'trialing': {
      const end = sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : 0
      if (end > t) return { kind: 'trial', daysLeft: Math.max(1, Math.ceil((end - t) / DAY)), endsAt: sub.trial_ends_at! }
      return { kind: 'blocked', reason: 'trial_ended' }
    }
    case 'active':
    case 'past_due': {
      if (!sub.current_period_end) return sub.status === 'active' ? { kind: 'active', renewsAt: null } : { kind: 'blocked', reason: 'payment_overdue' }
      const end = new Date(sub.current_period_end).getTime()
      if (sub.status === 'active' && end > t) return { kind: 'active', renewsAt: sub.current_period_end }
      if (end + GRACE_DAYS * DAY > t) return { kind: 'grace', until: new Date(end + GRACE_DAYS * DAY).toISOString() }
      return { kind: 'blocked', reason: 'payment_overdue' }
    }
    case 'canceled': {
      if (sub.current_period_end && new Date(sub.current_period_end).getTime() > t) {
        return { kind: 'ending', until: sub.current_period_end }
      }
      return { kind: 'blocked', reason: 'canceled' }
    }
    case 'pending':
      return { kind: 'blocked', reason: 'pending' }
  }
}
