import { useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Copy, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Choice'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { Alert, Card, EmptyState, Skeleton } from '@/components/ui/Feedback'
import { Field, Input, InputGroup, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errors'
import { centsToInput, formatCents, formatDate, parseMoneyToCents } from '@/lib/format'
import { queryKeys } from '@/lib/queryClient'
import { addDays, localDateString } from '@/lib/timezone'
import type { ProductRow, StoreRow } from '@/types/database'
import { deleteDailyMenu, fetchPreviousDailyMenu, saveDailyMenu, type DailyMenuWithItems } from '../api'
import { useDailyMenu } from '../hooks'

interface Draft {
  title: string
  note: string
  is_published: boolean
  items: Record<string, { selected: boolean; price: string; is_available: boolean }>
}

function draftFrom(menu: DailyMenuWithItems | null, products: ProductRow[]): Draft {
  const items: Draft['items'] = {}
  for (const p of products) {
    const item = menu?.daily_menu_items.find((i) => i.product_id === p.id)
    items[p.id] = { selected: Boolean(item), price: item?.price_cents != null ? centsToInput(item.price_cents) : '', is_available: item?.is_available ?? true }
  }
  return { title: menu?.title ?? '', note: menu?.note ?? '', is_published: menu?.is_published ?? true, items }
}

/**
 * Cardápio do dia: escolha quais produtos já cadastrados aparecem em uma
 * data, com preço opcional diferente. Sem cardápio do dia, o cliente vê
 * todos os produtos ativos.
 */
export function DailyMenuPanel({ store, products }: { store: StoreRow; products: ProductRow[] }) {
  const today = localDateString(new Date(), store.timezone)
  const [date, setDate] = useState(today)
  const menu = useDailyMenu(store.id, date)
  const active = useMemo(() => products.filter((p) => p.is_active), [products])

  if (active.length === 0) {
    return <EmptyState icon={<CalendarDays className="size-6" aria-hidden />} title="Cadastre produtos primeiro" description="O cardápio do dia é montado a partir dos produtos cadastrados." />
  }
  if (menu.isError) return <Alert tone="danger">{errorMessage(menu.error)}</Alert>
  if (menu.isPending) return <Skeleton className="h-96" />

  // O editor é recriado quando a data muda ou quando o servidor devolve uma nova versão salva.
  return (
    <DailyMenuEditor
      key={`${date}:${menu.dataUpdatedAt}`}
      store={store}
      date={date}
      today={today}
      onDateChange={setDate}
      saved={menu.data ?? null}
      active={active}
    />
  )
}

interface EditorProps {
  store: StoreRow
  date: string
  today: string
  onDateChange: (date: string) => void
  saved: DailyMenuWithItems | null
  active: ProductRow[]
}

function DailyMenuEditor({ store, date, today, onDateChange, saved, active }: EditorProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [draft, setDraft] = useState<Draft>(() => draftFrom(saved, active))
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedCount = Object.values(draft.items).filter((i) => i.selected).length
  const priceErrors = Object.entries(draft.items).filter(([, i]) => i.selected && i.price !== '' && parseMoneyToCents(i.price) === null)

  const copyPrevious = async () => {
    setError(null)
    try {
      const previous = await fetchPreviousDailyMenu(store.id, date)
      if (!previous) {
        toast.error('Não há cardápio do dia anterior para copiar.')
        return
      }
      setDraft({ ...draftFrom(previous, active), is_published: true })
      toast.success(`Itens copiados do cardápio de ${formatDate(previous.menu_date)}. Revise e salve.`)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const save = async () => {
    if (priceErrors.length) {
      setError('Corrija os preços inválidos (ex.: 18,90).')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await saveDailyMenu(store.id, date, {
        title: draft.title.trim(),
        note: draft.note.trim(),
        is_published: draft.is_published,
        items: active
          .filter((p) => draft.items[p.id]?.selected)
          .map((p) => ({
            product_id: p.id,
            price_cents: draft.items[p.id]!.price ? parseMoneyToCents(draft.items[p.id]!.price) : null,
            is_available: draft.items[p.id]!.is_available,
          })),
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.dailyMenu(store.id, date) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.publicMenu(store.slug) })
      toast.success('Cardápio do dia salvo.')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setSaving(true)
    try {
      await deleteDailyMenu(store.id, date)
      await queryClient.invalidateQueries({ queryKey: queryKeys.dailyMenu(store.id, date) })
      toast.success('Cardápio do dia removido. O cliente verá todos os produtos ativos.')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
      setConfirmDelete(false)
    }
  }

  const setItem = (id: string, patch: Partial<Draft['items'][string]>) =>
    setDraft((d) => ({ ...d, items: { ...d.items, [id]: { ...d.items[id]!, ...patch } } }))

  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info">
        Monte o cardápio de cada dia escolhendo entre os produtos já cadastrados. Quando existe cardápio do dia publicado, o cliente vê
        <strong> apenas</strong> esses itens; sem ele, vê todos os produtos ativos.
      </Alert>

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Field label="Data">
            <Input type="date" value={date} min={addDays(today, -30)} onChange={(e) => e.target.value && onDateChange(e.target.value)} className="w-auto" />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" icon={<Copy className="size-4" aria-hidden />} onClick={() => void copyPrevious()}>
              Copiar do último cardápio
            </Button>
            {saved ? (
              <Button variant="danger-ghost" size="sm" icon={<Trash2 className="size-4" aria-hidden />} onClick={() => setConfirmDelete(true)}>
                Remover
              </Button>
            ) : null}
          </div>
        </div>
        <p className="text-sm text-muted">
          {saved ? `Cardápio salvo para ${formatDate(date)}.` : `Nenhum cardápio do dia para ${formatDate(date)} — os clientes veem todos os produtos ativos.`}
          {date === today ? ' (hoje)' : ''}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título (opcional)">
            <Input value={draft.title} maxLength={80} placeholder="Ex.: Quarta da feijoada" onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </Field>
          <Field label="Recado (opcional)">
            <Textarea rows={1} value={draft.note} maxLength={280} placeholder="Ex.: Pedidos até 11h" onChange={(e) => setDraft({ ...draft, note: e.target.value })} className="min-h-11" />
          </Field>
        </div>
        <Switch checked={draft.is_published} onChange={(v) => setDraft({ ...draft, is_published: v })} label="Publicar este cardápio do dia" description="Desligado, o cardápio fica salvo como rascunho." />
      </Card>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {(
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line bg-canvas px-5 py-3 text-sm">
            <span className="font-semibold">Produtos do dia</span>
            <span className="text-muted">{selectedCount} selecionados</span>
          </div>
          <ul className="divide-y divide-line">
            {active.map((p) => {
              const item = draft.items[p.id] ?? { selected: false, price: '', is_available: true }
              const invalid = item.selected && item.price !== '' && parseMoneyToCents(item.price) === null
              return (
                <li key={p.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center">
                  <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3">
                    <input type="checkbox" className="size-5 accent-brand-600" checked={item.selected} onChange={(e) => setItem(p.id, { selected: e.target.checked })} />
                    <span>
                      <span className="block font-medium">{p.name}</span>
                      <span className="text-xs text-muted">Preço padrão {formatCents(p.price_cents)}</span>
                    </span>
                  </label>
                  {item.selected ? (
                    <div className="flex items-center gap-3 pl-8 sm:pl-0">
                      <div className="w-36">
                        <label className="sr-only" htmlFor={`preco-${p.id}`}>Preço de hoje para {p.name}</label>
                        <InputGroup prefix="R$">
                          <Input id={`preco-${p.id}`} inputMode="decimal" placeholder={centsToInput(p.price_cents)} value={item.price} aria-invalid={invalid || undefined} onChange={(e) => setItem(p.id, { price: e.target.value })} />
                        </InputGroup>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="size-4 accent-brand-600" checked={item.is_available} onChange={(e) => setItem(p.id, { is_available: e.target.checked })} />
                        Disponível
                      </label>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <div className="flex justify-end">
        <Button size="lg" loading={saving} onClick={() => void save()} disabled={selectedCount === 0}>
          Salvar cardápio do dia
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Remover o cardápio do dia?"
        description="Os clientes voltarão a ver todos os produtos ativos nesta data. Os produtos não são excluídos."
        confirmLabel="Remover"
        loading={saving}
        onConfirm={() => void remove()}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}
