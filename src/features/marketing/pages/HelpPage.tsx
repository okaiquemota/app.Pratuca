import { Mail, MessageCircle } from 'lucide-react'
import { Link } from 'react-router'
import { Alert, Card } from '@/components/ui/Feedback'
import { buildWaMeLink } from '@/features/whatsapp/link'
import { env } from '@/lib/env'
import { toWhatsappNumber } from '@/lib/phone'
import { FAQ } from '../content'

const guides = [
  { title: 'Primeiros passos', items: ['Crie a conta e informe o nome do negócio.', 'Escolha o endereço do cardápio (ex.: /loja/sabor-da-nona).', 'Informe o WhatsApp que recebe os pedidos e como você atende.', 'Cadastre os produtos e publique.'] },
  { title: 'Cardápio do dia', items: ['Em Cardápio → Cardápio do dia, escolha a data.', 'Marque os produtos do dia e, se quiser, um preço diferente.', 'Use "Copiar do último cardápio" para ganhar tempo.', 'Sem cardápio do dia, o cliente vê todos os produtos ativos.'] },
  { title: 'Pedidos', items: ['Novos pedidos aparecem em Pedidos e no Início.', 'Abra o pedido para ver itens, endereço e pagamento.', 'Avance o status: confirmado, em preparo, pronto, saiu para entrega, concluído.', 'A aba Produção mostra quanto preparar no dia.'] },
]

export default function HelpPage() {
  const whatsapp = env.supportWhatsapp ? toWhatsappNumber(env.supportWhatsapp) : null
  return (
    <>
      <title>Ajuda — Pratuca</title>
      <section className="bg-brand-100 py-14">
        <div className="container-page">
          <h1 className="text-4xl font-bold tracking-tight">Central de ajuda</h1>
          <p className="mt-3 max-w-xl text-ink/75">Guias rápidos para usar a Pratuca no dia a dia.</p>
        </div>
      </section>
      <section className="py-14">
        <div className="container-page grid gap-6 md:grid-cols-3">
          {guides.map((g) => (
            <Card key={g.title} className="p-6">
              <h2 className="font-semibold">{g.title}</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink/80">
                {g.items.map((i) => <li key={i}>{i}</li>)}
              </ol>
            </Card>
          ))}
        </div>
        <div className="container-page mt-12 grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div>
            <h2 className="text-xl font-bold">Perguntas frequentes</h2>
            <div className="mt-4 divide-y divide-line rounded-2xl border border-line">
              {FAQ.map((f) => (
                <details key={f.q} className="px-5 py-4">
                  <summary className="cursor-pointer font-semibold">{f.q}</summary>
                  <p className="mt-2 text-sm text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
          <aside aria-labelledby="contato">
            <h2 id="contato" className="text-xl font-bold">Fale com a gente</h2>
            <div className="mt-4 flex flex-col gap-3">
              {env.supportEmail ? (
                <a href={`mailto:${env.supportEmail}`} className="flex items-center gap-3 rounded-xl border border-line p-4 hover:bg-brand-50">
                  <Mail className="size-5 text-brand-700" aria-hidden /> {env.supportEmail}
                </a>
              ) : null}
              {whatsapp ? (
                <a href={buildWaMeLink(whatsapp) ?? '#'} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-line p-4 hover:bg-brand-50">
                  <MessageCircle className="size-5 text-brand-700" aria-hidden /> WhatsApp do suporte
                </a>
              ) : null}
              {!env.supportEmail && !whatsapp ? (
                <Alert tone="info">Os canais de atendimento estão sendo configurados. Enquanto isso, consulte os guias ao lado.</Alert>
              ) : null}
              <p className="text-sm text-muted">
                Veja também os <Link to="/termos" className="underline">termos de uso</Link> e a <Link to="/privacidade" className="underline">política de privacidade</Link>.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
