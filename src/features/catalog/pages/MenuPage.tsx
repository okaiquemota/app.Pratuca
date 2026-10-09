import { useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Eye, EyeOff, ImageOff, Pencil, Plus, Trash2, UtensilsCrossed } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Choice'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { Alert, Badge, Card, EmptyState, PageHeader, Skeleton } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/toast'
import { useStore } from '@/features/stores/hooks'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/errors'
import { formatCents } from '@/lib/format'
import { queryKeys } from '@/lib/queryClient'
import { publicImageUrl } from '@/lib/supabase'
import type { ProductRow } from '@/types/database'
import { deleteProduct, reorder, setProductFlags } from '../api'
import { DailyMenuPanel } from '../components/DailyMenuPanel'
import { ProductFormDialog } from '../components/ProductFormDialog'
import { useCategories, useProducts } from '../hooks'

export default function MenuPage() {
  const store = useStore()
  const [params, setParams] = useSearchParams()
  const products = useProducts(store.id)
  const categories = useCategories(store.id)
  const queryClient = useQueryClient()
  const toast = useToast()
  const [editing, setEditing] = useState<ProductRow | 'new' | null>(params.get('novo') ? 'new' : null)
  const [deleting, setDeleting] = useState<ProductRow | null>(null)
  const [busy, setBusy] = useState(false)
  const tab = params.get('aba') === 'dia' ? 'daily' : 'products'

  const list = useMemo(() => products.data ?? [], [products.data])
  const groups = useMemo(() => {
    const cats = categories.data ?? []
    const sections = cats.map((c) => ({ id: c.id, name: c.name, hidden: !c.is_active, items: list.filter((p) => p.category_id === c.id) }))
    const uncategorized = list.filter((p) => !p.category_id || !cats.some((c) => c.id === p.category_id))
    if (uncategorized.length) sections.push({ id: 'none', name: 'Sem categoria', hidden: false, items: uncategorized })
    return sections.filter((s) => s.items.length > 0)
  }, [list, categories.data])

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.products(store.id) })

  const toggle = async (product: ProductRow, flags: Partial<Pick<ProductRow, 'is_available' | 'is_active'>>) => {
    queryClient.setQueryData<ProductRow[]>(queryKeys.products(store.id), (old) => old?.map((p) => (p.id === product.id ? { ...p, ...flags } : p)))
    try {
      await setProductFlags(product.id, flags)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      void refresh()
    }
  }

  const move = async (sectionItems: ProductRow[], index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= sectionItems.length) return
    const ordered = [...sectionItems]
    const [item] = ordered.splice(index, 1)
    ordered.splice(target, 0, item!)
    // reaplica posições globais preservando os demais
    const ids = list.map((p) => p.id).filter((id) => !ordered.some((o) => o.id === id))
    const firstIndex = list.findIndex((p) => p.id === sectionItems[0]!.id)
    ids.splice(Math.max(0, firstIndex), 0, ...ordered.map((o) => o.id))
    setBusy(true)
    try {
      await reorder('products', ids)
      await refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await deleteProduct(deleting.id)
      toast.success('Produto excluído. Os pedidos antigos continuam com o histórico.')
      await refresh()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
      setDeleting(null)
    }
  }

  const closeForm = () => {
    setEditing(null)
    if (params.get('novo')) {
      params.delete('novo')
      setParams(params, { replace: true })
    }
  }

  return (
    <>
      <title>Cardápio — Pratuca</title>
      <PageHeader
        title="Cardápio"
        description="Produtos, preços, fotos, adicionais e o cardápio de cada dia."
        actions={
          <>
            <ButtonLink to="/app/categorias" variant="outline">Categorias</ButtonLink>
            <Button icon={<Plus className="size-4" aria-hidden />} onClick={() => setEditing('new')}>
              Novo produto
            </Button>
          </>
        }
      />

      <div role="tablist" aria-label="Seções do cardápio" className="mb-5 inline-flex rounded-xl bg-white p-1 ring-1 ring-line">
        {[
          { value: 'products', label: 'Produtos' },
          { value: 'daily', label: 'Cardápio do dia' },
        ].map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setParams(t.value === 'daily' ? { aba: 'dia' } : {}, { replace: true })}
            className={cn('min-h-10 rounded-lg px-4 text-sm font-semibold', tab === t.value ? 'bg-ink text-white' : 'text-muted hover:text-ink')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {products.isError ? <Alert tone="danger" className="mb-4">{errorMessage(products.error)}</Alert> : null}

      {products.isPending ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : tab === 'daily' ? (
        <DailyMenuPanel store={store} products={list} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="size-6" aria-hidden />}
          title="Seu cardápio está vazio"
          description="Cadastre seus produtos com preço, descrição e foto. Depois, monte o cardápio de cada dia sem recadastrar nada."
          action={<Button icon={<Plus className="size-4" aria-hidden />} onClick={() => setEditing('new')}>Cadastrar primeiro produto</Button>}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((section) => (
            <section key={section.id} aria-labelledby={`sec-${section.id}`}>
              <h2 id={`sec-${section.id}`} className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted uppercase">
                {section.name}
                {section.hidden ? <Badge>Categoria oculta</Badge> : null}
              </h2>
              <ul className="flex flex-col gap-2">
                {section.items.map((p, index) => {
                  const image = publicImageUrl(p.image_path)
                  return (
                    <li key={p.id}>
                      <Card className={cn('flex flex-col gap-3 p-3 sm:flex-row sm:items-center', !p.is_active && 'opacity-70')}>
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-canvas">
                            {image ? <img src={image} alt="" className="size-full object-cover" loading="lazy" /> : <ImageOff className="size-5 text-muted" aria-hidden />}
                          </div>
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-2 font-semibold">
                              <span className="truncate">{p.name}</span>
                              {!p.is_active ? <Badge>Desativado</Badge> : !p.is_available ? <Badge tone="warning">Esgotado</Badge> : null}
                            </p>
                            {p.description ? <p className="line-clamp-1 text-sm text-muted">{p.description}</p> : null}
                            <p className="text-sm font-semibold">{formatCents(p.price_cents)}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 sm:border-0 sm:pt-0">
                          <Switch
                            checked={p.is_available}
                            onChange={(v) => void toggle(p, { is_available: v })}
                            disabled={!p.is_active}
                            label={<span className="text-xs">Disponível</span>}
                            className="gap-2"
                          />
                          <div className="flex items-center">
                            <Button variant="ghost" size="icon" aria-label={`Mover ${p.name} para cima`} disabled={busy || index === 0} onClick={() => void move(section.items, index, -1)}>
                              <ArrowUp className="size-4" aria-hidden />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label={`Mover ${p.name} para baixo`} disabled={busy || index === section.items.length - 1} onClick={() => void move(section.items, index, 1)}>
                              <ArrowDown className="size-4" aria-hidden />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label={p.is_active ? `Desativar ${p.name}` : `Ativar ${p.name}`} onClick={() => void toggle(p, { is_active: !p.is_active })}>
                              {p.is_active ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                            </Button>
                            <Button variant="ghost" size="icon" aria-label={`Editar ${p.name}`} onClick={() => setEditing(p)}>
                              <Pencil className="size-4" aria-hidden />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label={`Excluir ${p.name}`} onClick={() => setDeleting(p)}>
                              <Trash2 className="size-4" aria-hidden />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {editing ? (
        <ProductFormDialog
          storeId={store.id}
          product={editing === 'new' ? null : editing}
          categories={categories.data ?? []}
          nextPosition={list.length}
          onClose={closeForm}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Excluir "${deleting?.name ?? ''}"?`}
        description="O produto sai do cardápio definitivamente. Se quiser apenas esconder por um tempo, use Desativar. Pedidos antigos mantêm o nome e o preço registrados."
        confirmLabel="Excluir produto"
        loading={busy}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
      />
    </>
  )
}
