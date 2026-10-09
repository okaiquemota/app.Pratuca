import { CalendarDays, Check, ChefHat, ClipboardList, Link2, MessageCircle, Percent, Smartphone, Soup, Timer } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { FAQ } from '../content'
import { ExampleTag, OrdersDemo, PhoneMenuDemo, ProductionDemo } from '../components/Demos'

export default function LandingPage() {
  return (
    <>
      <title>Pratuca — Seu delivery, sem bagunça.</title>
      <meta name="description" content="Cardápio digital, pedidos organizados e resumo de produção para marmitarias. R$ 39,90/mês, sem comissão por pedido." />

      {/* Hero */}
      <section className="overflow-hidden bg-brand-100">
        <div className="container-page grid items-center gap-12 py-14 md:grid-cols-[1.15fr_1fr] md:py-20">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium text-ink-soft">
              <Soup className="size-4 text-brand-700" aria-hidden /> Feito para marmitarias e pequenos deliveries
            </p>
            <h1 className="text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Seu delivery, <span className="text-brand-700">sem bagunça.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink/80">
              Crie seu cardápio digital, receba pedidos organizados e saiba exatamente quantas marmitas preparar — sem se perder em conversas de
              WhatsApp.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to="/criar-conta" size="lg">Começar teste grátis de 7 dias</ButtonLink>
              <ButtonLink to="/#como-funciona" variant="outline" size="lg">Ver como funciona</ButtonLink>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
              {['R$ 39,90/mês', 'Sem comissão por pedido', 'Sem fidelidade'].map((t) => (
                <li key={t} className="flex items-center gap-1.5"><Check className="size-4 text-success-600" aria-hidden /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="relative flex flex-col items-center gap-3">
            <PhoneMenuDemo />
            <ExampleTag />
          </div>
        </div>
      </section>

      {/* Proposta de valor */}
      <section className="py-16 sm:py-20" aria-labelledby="proposta">
        <div className="container-page">
          <div className="max-w-2xl">
            <h2 id="proposta" className="text-3xl font-bold tracking-tight">Organize seus pedidos e foque no que você faz de melhor: cozinhar.</h2>
            <p className="mt-4 text-ink/75">
              A Pratuca não é marketplace e não fica com parte das suas vendas. É a sua loja, com o seu link, os seus clientes e um painel simples
              para dar conta da correria do almoço.
            </p>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Smartphone, title: 'Cardápio digital', text: 'Seu cardápio com fotos, preços e adicionais em um link para compartilhar.' },
              { icon: MessageCircle, title: 'Pedidos pelo WhatsApp', text: 'O cliente envia o resumo pronto para o seu WhatsApp, sem idas e vindas.' },
              { icon: ClipboardList, title: 'Tudo registrado', text: 'Cada pedido entra no painel com itens, endereço, pagamento e status.' },
              { icon: Percent, title: 'Sem comissão', text: 'Mensalidade fixa. O que você vende é seu.' },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-2xl border border-line p-5">
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Icon className="size-5" aria-hidden /></span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Demonstração: pedidos */}
      <section className="bg-canvas py-16 sm:py-20" aria-labelledby="demo-pedidos">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 id="demo-pedidos" className="text-3xl font-bold tracking-tight">Pedidos organizados do início ao fim</h2>
            <p className="mt-4 text-ink/75">
              Novo, confirmado, em preparo, pronto, saiu para entrega, concluído. Você acompanha cada pedido por status e filtra por dia — no
              celular ou no computador.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {['Número de pedido fácil de falar com o cliente', 'Itens, observações e endereço em um só lugar', 'Atualização automática enquanto você trabalha'].map((t) => (
                <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success-600" aria-hidden /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <OrdersDemo />
            <ExampleTag className="self-start" />
          </div>
        </div>
      </section>

      {/* Benefícios para marmitarias + produção */}
      <section className="py-16 sm:py-20" aria-labelledby="marmitarias">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2">
          <div className="order-2 flex flex-col gap-3 lg:order-1">
            <ProductionDemo />
            <ExampleTag className="self-start" />
          </div>
          <div className="order-1 lg:order-2">
            <h2 id="marmitarias" className="text-3xl font-bold tracking-tight">Pensado para quem vende marmita</h2>
            <ul className="mt-6 space-y-5">
              {[
                { icon: ChefHat, title: 'Resumo de produção', text: 'Veja quantas marmitas de cada tipo preparar hoje, quantas faltam e quantas já saíram.' },
                { icon: CalendarDays, title: 'Cardápio do dia', text: 'Escolha o que vai ter hoje entre os produtos já cadastrados e copie o cardápio de ontem em um clique.' },
                { icon: Timer, title: 'Opções e adicionais', text: '"Escolha a carne", "ovo extra", "sem salada": o cliente escolhe e o preço é calculado certinho.' },
              ].map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Icon className="size-5" aria-hidden /></span>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm text-muted">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Como começar */}
      <section id="como-funciona" className="scroll-mt-20 bg-ink py-16 text-brand-100 sm:py-20" aria-labelledby="como-comecar">
        <div className="container-page">
          <h2 id="como-comecar" className="text-3xl font-bold tracking-tight text-white">Comece em três passos</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { title: 'Crie sua conta', text: 'Informe o nome do negócio, escolha o endereço do cardápio e o WhatsApp que recebe os pedidos.' },
              { title: 'Cadastre seus produtos', text: 'Nome, preço, foto e adicionais. Monte o cardápio do dia quando quiser.' },
              { title: 'Compartilhe o link', text: 'Mande no WhatsApp, coloque no Instagram e comece a receber pedidos organizados.' },
            ].map((s, i) => (
              <li key={s.title} className="rounded-2xl bg-white/5 p-6">
                <span className="flex size-10 items-center justify-center rounded-full bg-brand-500 font-bold text-ink">{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-brand-100/75">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex items-center gap-3 text-sm text-brand-100/80">
            <Link2 className="size-4" aria-hidden /> Seu link fica assim: <span className="font-semibold text-white">pratuca…/loja/seu-negocio</span>
          </div>
        </div>
      </section>

      {/* Preço */}
      <section className="py-16 sm:py-20" aria-labelledby="preco">
        <div className="container-page">
          <div className="mx-auto max-w-md rounded-3xl border-2 border-brand-500 bg-white p-8 text-center shadow-soft">
            <h2 id="preco" className="text-sm font-semibold tracking-wide text-brand-700 uppercase">Plano único</h2>
            <p className="mt-3 text-5xl font-bold">R$ 39,90<span className="text-lg font-medium text-muted">/mês</span></p>
            <p className="mt-2 text-muted">Sem comissão por pedido. 7 dias de teste.</p>
            <ul className="mt-6 space-y-2 text-left text-sm">
              {['Pedidos ilimitados', 'Cardápio digital com link próprio', 'Resumo de produção', 'Cardápio do dia e adicionais', 'Envio do pedido pelo WhatsApp'].map((t) => (
                <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success-600" aria-hidden /> {t}</li>
              ))}
            </ul>
            <ButtonLink to="/criar-conta" size="lg" className="mt-8 w-full">Começar teste grátis</ButtonLink>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-canvas py-16 sm:py-20" aria-labelledby="faq">
        <div className="container-page max-w-3xl">
          <h2 id="faq" className="text-3xl font-bold tracking-tight">Perguntas frequentes</h2>
          <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-white">
            {FAQ.map((item) => (
              <details key={item.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {item.q}
                  <span className="text-xl text-brand-700 transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-sm text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-brand-500 py-16">
        <div className="container-page flex flex-col items-center gap-6 text-center">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-ink">Mais pedidos. Menos confusão.</h2>
          <p className="max-w-xl text-ink/80">Configure sua loja em poucos minutos e teste por 7 dias.</p>
          <ButtonLink to="/criar-conta" size="lg" variant="dark">Criar minha loja</ButtonLink>
        </div>
      </section>
    </>
  )
}
