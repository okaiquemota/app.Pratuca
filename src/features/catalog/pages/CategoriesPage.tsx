import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Check, FolderTree, Pencil, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Choice'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { Alert, Card, EmptyState, PageHeader, Skeleton } from '@/components/ui/Feedback'
import { Field, Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/toast'
import { useStore } from '@/features/stores/hooks'
import { errorMessage } from '@/lib/errors'
import { queryKeys } from '@/lib/queryClient'
import type { CategoryRow } from '@/types/database'
import { deleteCategory, reorder, saveCategory } from '../api'
import { useCategories, useProducts } from '../hooks'
import { categorySchema, type CategoryValues } from '../schemas'

export default function CategoriesPage() {
  const store = useStore()
  const categories = useCategories(store.id)
  const products = useProducts(store.id)
  const queryClient = useQueryClient()
  const toast = useToast()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<CategoryRow | null>(null)
  const [busy, setBusy] = useState(false)
  const list = categories.data ?? []

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.categories(store.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.products(store.id) }),
    ])

  const form = useForm<CategoryValues>({ resolver: zodResolver(categorySchema), defaultValues: { name: '' } })

  const create = form.handleSubmit(async ({ name }) => {
    try {
      await saveCategory(store.id, { name, position: list.length })
      form.reset()
      await refresh()
      toast.success('Categoria criada.')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  })

  const run = async (action: () => Promise<unknown>, success?: string) => {
    setBusy(true)
    try {
      await action()
      await refresh()
      if (success) toast.success(success)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const move = (index: number, delta: number) => {
    const ids = list.map((c) => c.id)
    const [id] = ids.splice(index, 1)
    ids.splice(index + delta, 0, id!)
    void run(() => reorder('categories', ids))
  }

  const countFor = (id: string) => (products.data ?? []).filter((p) => p.category_id === id).length

  return (
    <>
      <title>Categorias — Pratuca</title>
      <PageHeader title="Categorias" description="Organize o cardápio em seções, como Marmitas, Bebidas e Sobremesas." />

      <Card className="mb-6 p-5">
        <form onSubmit={create} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <Field label="Nova categoria" error={form.formState.errors.name?.message} className="flex-1">
            <Input placeholder="Ex.: Marmitas" {...form.register('name')} />
          </Field>
          <Button type="submit" loading={form.formState.isSubmitting} className="sm:mt-7">
            Adicionar
          </Button>
        </form>
      </Card>

      {categories.isError ? <Alert tone="danger">{errorMessage(categories.error)}</Alert> : null}

      {categories.isPending ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState icon={<FolderTree className="size-6" aria-hidden />} title="Nenhuma categoria" description="Categorias são opcionais, mas ajudam o cliente a encontrar o que procura." />
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {list.map((c, index) => (
              <li key={c.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                {editingId === c.id ? (
                  <InlineEdit
                    initial={c.name}
                    onCancel={() => setEditingId(null)}
                    onSave={(name) => run(() => saveCategory(store.id, { id: c.id, name }), 'Categoria renomeada.').then(() => setEditingId(null))}
                  />
                ) : (
                  <div className="flex-1">
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-muted">{countFor(c.id)} produtos</p>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <Switch checked={c.is_active} onChange={(v) => void run(() => saveCategory(store.id, { id: c.id, name: c.name, is_active: v }))} label={<span className="text-xs">Visível</span>} className="gap-2" />
                  <div className="flex">
                    <Button variant="ghost" size="icon" aria-label={`Mover ${c.name} para cima`} disabled={busy || index === 0} onClick={() => move(index, -1)}>
                      <ArrowUp className="size-4" aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Mover ${c.name} para baixo`} disabled={busy || index === list.length - 1} onClick={() => move(index, 1)}>
                      <ArrowDown className="size-4" aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Renomear ${c.name}`} onClick={() => setEditingId(c.id)}>
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Excluir ${c.name}`} onClick={() => setDeleting(c)}>
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Excluir a categoria "${deleting?.name ?? ''}"?`}
        description="Os produtos desta categoria não são excluídos: eles passam para “Sem categoria”."
        confirmLabel="Excluir categoria"
        loading={busy}
        onConfirm={() => deleting && void run(() => deleteCategory(deleting.id), 'Categoria excluída.').then(() => setDeleting(null))}
        onClose={() => setDeleting(null)}
      />
    </>
  )
}

function InlineEdit({ initial, onSave, onCancel }: { initial: string; onSave: (name: string) => Promise<void>; onCancel: () => void }) {
  const form = useForm<CategoryValues>({ resolver: zodResolver(categorySchema), defaultValues: { name: initial } })
  return (
    <form onSubmit={form.handleSubmit(({ name }) => onSave(name))} noValidate className="flex flex-1 items-start gap-2">
      <Field label={<span className="sr-only">Nome da categoria</span>} error={form.formState.errors.name?.message} className="flex-1">
        <Input autoFocus {...form.register('name')} />
      </Field>
      <Button type="submit" size="icon" aria-label="Salvar" loading={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? null : <Check className="size-4" aria-hidden />}
      </Button>
      <Button variant="ghost" size="icon" aria-label="Cancelar" onClick={onCancel}>
        <X className="size-4" aria-hidden />
      </Button>
    </form>
  )
}
