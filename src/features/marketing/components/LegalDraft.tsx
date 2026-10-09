import type { ReactNode } from 'react'
import { Alert } from '@/components/ui/Feedback'

export function LegalDraft({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="container-page max-w-3xl py-14">
      <title>{`${title} — Pratuca`}</title>
      <meta name="robots" content="noindex" />
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted">Versão preliminar — {updated}</p>
      <Alert tone="warning" title="Rascunho para revisão jurídica" className="mt-6">
        Este texto é um rascunho inicial e ainda não foi revisado por profissional jurídico. Ele não substitui um documento definitivo e não
        representa declaração de conformidade com a LGPD ou outras normas.
      </Alert>
      <div className="mt-8 space-y-6 text-[0.95rem] leading-relaxed text-ink/85 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  )
}
