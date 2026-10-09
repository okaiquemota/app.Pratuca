import { AlertCircle, CheckCircle2, Info, Loader2, TriangleAlert } from 'lucide-react'
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-line bg-white', className)} {...props} />
}

export type BadgeTone = 'brand' | 'info' | 'warning' | 'success' | 'neutral' | 'danger'

const badgeTones: Record<BadgeTone, string> = {
  brand: 'bg-brand-100 text-brand-800',
  info: 'bg-info-50 text-info-700',
  warning: 'bg-warning-50 text-warning-700',
  success: 'bg-success-50 text-success-700',
  neutral: 'bg-canvas text-muted border border-line',
  danger: 'bg-danger-50 text-danger-600',
}

export function Badge({ tone = 'neutral', className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', badgeTones[tone], className)}>
      {children}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-skeleton rounded-lg bg-brand-100/70', className)} aria-hidden />
}

export function Spinner({ label = 'Carregando…', className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-2 py-10 text-sm text-muted', className)}>
      <Loader2 className="size-5 animate-spin text-brand-600" aria-hidden />
      <span>{label}</span>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-white px-6 py-10 text-center', className)}>
      {icon ? <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">{icon}</div> : null}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description ? <p className="max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  )
}

type AlertTone = 'info' | 'warning' | 'danger' | 'success'
const alertStyles: Record<AlertTone, { box: string; icon: ReactNode }> = {
  info: { box: 'border-info-700/20 bg-info-50 text-info-700', icon: <Info className="size-5 shrink-0" aria-hidden /> },
  warning: { box: 'border-warning-700/20 bg-warning-50 text-warning-700', icon: <TriangleAlert className="size-5 shrink-0" aria-hidden /> },
  danger: { box: 'border-danger-600/20 bg-danger-50 text-danger-600', icon: <AlertCircle className="size-5 shrink-0" aria-hidden /> },
  success: { box: 'border-success-600/20 bg-success-50 text-success-700', icon: <CheckCircle2 className="size-5 shrink-0" aria-hidden /> },
}

export function Alert({
  tone = 'info',
  title,
  children,
  action,
  className,
}: {
  tone?: AlertTone
  title?: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  const style = alertStyles[tone]
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-xl border px-4 py-3 text-sm', style.box, className)}>
      {style.icon}
      <div className="flex flex-1 flex-col gap-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-ink/80">{children}</div> : null}
        {action ? <div className="mt-1">{action}</div> : null}
      </div>
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}
