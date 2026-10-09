import { cn } from '@/lib/cn'

/** Ícone do chapéu de chef da Pratuca. */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 64 56"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g fill="#F28C38">
        <circle cx="19" cy="22" r="12" />
        <circle cx="32" cy="15" r="14" />
        <circle cx="45" cy="22" r="12" />
        <rect x="13" y="20" width="38" height="26" rx="9" />
      </g>
      <path d="M22.5 37.5c6-4.6 13.5-5.6 20-3" fill="none" stroke="#FFF3E5" strokeWidth="4" strokeLinecap="round" />
      <circle cx="21.5" cy="38.3" r="3" fill="#FFF3E5" />
    </svg>
  )
}

export function Logo({
  className,
  tone = 'dark',
  size = 'md',
}: {
  className?: string
  tone?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizes = { sm: 'h-6 text-lg', md: 'h-8 text-2xl', lg: 'h-12 text-4xl' }
  return (
    <span className={cn('inline-flex items-center gap-2 font-bold tracking-tight', className)}>
      <LogoMark className={cn(sizes[size].split(' ')[0], 'w-auto shrink-0')} />
      <span className={cn(sizes[size].split(' ')[1], tone === 'dark' ? 'text-ink' : 'text-brand-100', 'leading-none')}>
        pratuca
      </span>
    </span>
  )
}
