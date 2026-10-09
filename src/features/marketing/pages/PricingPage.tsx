import { Check } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { FAQ } from '../content'

const included = [
  'Cardápio digital com link próprio',
  'Pedidos ilimitados, sem comissão',
  'Painel de pedidos por status',
  'Resumo de produção do dia',
  'Cardápio do dia, categorias e adicionais',
  'Envio do resumo do pedido pelo WhatsApp',
  'Cadastro automático de clientes',
]

export default function PricingPage() {
  return (
    <>
      <title>Preços — Pratuca</title>
      <meta name="description" content="Plano único de R$ 39,90 por mês, sem comissão por pedido e com 7 dias de teste." />
      <section className="bg-brand-100 py-16">
        <div className="container-page text-center">
          <h1 className="text-4xl font-bold tracking-tight">Um preço simples, sem surpresa</h1>
          <p className="mx-auto mt-4 max-w-xl text-ink/75">Mensalidade fixa. Nenhuma porcentagem sobre o que você vende.</p>
        </div>
      </section>
      <section className="py-16">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border-2 border-brand-500 bg-white p-8 shadow-soft">
            <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">Plano Essencial</p>
            <p className="mt-3 text-5xl font-bold">R$ 39,90<span className="text-lg font-medium text-muted">/mês</span></p>
            <p className="mt-2 text-muted">7 dias de teste para configurar e receber os primeiros pedidos.</p>
            <ul className="mt-6 space-y-3">
              {included.map((t) => (
                <li key={t} className="flex gap-2"><Check className="mt-0.5 size-5 shrink-0 text-success-600" aria-hidden /> {t}</li>
              ))}
            </ul>
            <ButtonLink to="/criar-conta" size="lg" className="mt-8 w-full">Começar teste grátis</ButtonLink>
            <p className="mt-3 text-center text-xs text-muted">Sem fidelidade. Cancele quando quiser.</p>
          </div>
          <div>
            <h2 className="text-xl font-bold">Dúvidas sobre o plano</h2>
            <dl className="mt-6 space-y-6">
              {FAQ.filter((f) => /comissão|teste|atrasar|cancelar|pagamento dos clientes/i.test(f.q)).map((f) => (
                <div key={f.q}>
                  <dt className="font-semibold">{f.q}</dt>
                  <dd className="mt-1 text-sm text-muted">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </>
  )
}
