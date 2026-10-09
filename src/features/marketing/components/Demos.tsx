import { Plus, ShoppingBag } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'
import { cn } from '@/lib/cn'

/** Selo que identifica as demonstrações como exemplos fictícios. */
export function ExampleTag({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full bg-ink px-2.5 py-1 text-[0.7rem] font-semibold tracking-wide text-brand-100 uppercase', className)}>
      Exemplo ilustrativo
    </span>
  )
}

const demoProducts = [
  { name: 'Marmita Tradicional', desc: 'Arroz, feijão, carne e legumes', price: 'R$ 18,90' },
  { name: 'Marmita Fit', desc: 'Arroz integral, frango e salada', price: 'R$ 19,90' },
  { name: 'Marmita Especial', desc: 'Carne, arroz, feijão e batata', price: 'R$ 22,90' },
]

export function PhoneMenuDemo() {
  return (
    <figure className="relative mx-auto w-full max-w-[19rem]">
      <div className="rounded-[2.4rem] border-[10px] border-ink bg-white shadow-soft">
        <div className="flex justify-center py-2">
          <span className="h-1.5 w-16 rounded-full bg-ink/80" aria-hidden />
        </div>
        <div className="px-4 pb-5">
          <div className="flex items-center gap-3 rounded-2xl bg-brand-100 p-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white">
              <LogoMark className="h-6 w-auto" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">Sabor da Nona</p>
              <p className="text-[0.7rem] text-ink-soft">Marmitas caseiras</p>
            </div>
            <span className="rounded-full bg-success-50 px-2 py-0.5 text-[0.65rem] font-semibold text-success-700">Aberto</span>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {demoProducts.map((p) => (
              <li key={p.name} className="flex items-center gap-3 rounded-xl border border-line p-2.5">
                <span className="size-11 shrink-0 rounded-lg bg-gradient-to-br from-brand-300 to-brand-500" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.8rem] font-semibold">{p.name}</p>
                  <p className="truncate text-[0.65rem] text-muted">{p.desc}</p>
                  <p className="text-[0.75rem] font-semibold">{p.price}</p>
                </div>
                <span className="flex size-6 items-center justify-center rounded-full bg-brand-500 text-ink" aria-hidden>
                  <Plus className="size-3.5" />
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-500 px-3 py-2.5 text-[0.8rem] font-semibold text-ink">
            <span className="flex items-center gap-1.5"><ShoppingBag className="size-4" aria-hidden /> 2 itens</span>
            <span>R$ 41,80</span>
          </div>
        </div>
      </div>
      <figcaption className="sr-only">Exemplo ilustrativo de cardápio digital no celular, com uma loja fictícia.</figcaption>
    </figure>
  )
}

const demoOrders = [
  { code: '#0023', time: '11:42', name: 'Cliente A', items: '2 marmitas', total: 'R$ 37,80', status: 'Em preparo', tone: 'bg-warning-50 text-warning-700' },
  { code: '#0022', time: '11:28', name: 'Cliente B', items: '1 marmita', total: 'R$ 18,90', status: 'Novo', tone: 'bg-brand-100 text-brand-800' },
  { code: '#0021', time: '11:15', name: 'Cliente C', items: '3 marmitas', total: 'R$ 56,70', status: 'Saiu para entrega', tone: 'bg-info-50 text-info-700' },
  { code: '#0020', time: '10:54', name: 'Cliente D', items: '2 marmitas', total: 'R$ 41,80', status: 'Concluído', tone: 'bg-canvas text-muted' },
]

export function OrdersDemo() {
  return (
    <figure className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="font-semibold">Pedidos de hoje</p>
        <div className="hidden gap-1 text-xs sm:flex" aria-hidden>
          {['Todos', 'Em aberto', 'Concluídos'].map((t, i) => (
            <span key={t} className={cn('rounded-full px-2.5 py-1', i === 0 ? 'bg-brand-500 font-semibold text-ink' : 'border border-line text-muted')}>{t}</span>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-line text-sm">
        {demoOrders.map((o) => (
          <li key={o.code} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[4rem_3rem_1fr_6rem_5rem_auto]">
            <span className="font-bold">{o.code}</span>
            <span className="hidden text-muted sm:block">{o.time}</span>
            <span className="truncate">{o.name}<span className="block text-xs text-muted sm:hidden">{o.items} · {o.total}</span></span>
            <span className="hidden text-muted sm:block">{o.items}</span>
            <span className="hidden tabular-nums sm:block">{o.total}</span>
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', o.tone)}>{o.status}</span>
          </li>
        ))}
      </ul>
      <figcaption className="sr-only">Exemplo ilustrativo do painel de pedidos, com dados fictícios.</figcaption>
    </figure>
  )
}

const demoProduction = [
  { name: 'Marmita de frango', total: 18, pending: 11 },
  { name: 'Marmita de carne', total: 12, pending: 5 },
  { name: 'Marmita vegetariana', total: 7, pending: 2 },
]

export function ProductionDemo() {
  return (
    <figure className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="font-semibold">Produção de hoje</p>
          <p className="text-xs text-muted">Sem pedidos cancelados</p>
        </div>
        <p className="text-right"><span className="block text-2xl font-bold">37</span><span className="text-xs text-muted">18 a produzir</span></p>
      </div>
      <ul className="space-y-4">
        {demoProduction.map((p) => (
          <li key={p.name}>
            <div className="flex justify-between font-medium"><span>{p.name}</span><span className="text-lg font-bold">{p.total}</span></div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-100" aria-hidden>
              <div className="h-full rounded-full bg-success-600" style={{ width: `${((p.total - p.pending) / p.total) * 100}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted">{p.pending} a produzir · {p.total - p.pending} prontas</p>
          </li>
        ))}
      </ul>
      <figcaption className="sr-only">Exemplo ilustrativo do resumo de produção, com quantidades fictícias.</figcaption>
    </figure>
  )
}
