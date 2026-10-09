import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { Field, Input, InputGroup, Textarea } from '@/components/ui/Field'
import { saveProduct } from '@/features/catalog/api'
import { useProducts } from '@/features/catalog/hooks'
import { moneySchema } from '@/features/stores/schemas'
import { useUpdateStore } from '@/features/stores/hooks'
import { errorMessage } from '@/lib/errors'
import { formatCents, parseMoneyToCents } from '@/lib/format'
import { queryKeys } from '@/lib/queryClient'
import type { StoreRow } from '@/types/database'

const schema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do produto.').max(80, 'Máximo de 80 caracteres.'),
  description: z.string().trim().max(300, 'Máximo de 300 caracteres.'),
  price: moneySchema({ required: true, max: 1000, label: 'o preço' }),
})
type Values = z.infer<typeof schema>

export function StepProduct({ store }: { store: StoreRow }) {
  const queryClient = useQueryClient()
  const update = useUpdateStore()
  const products = useProducts(store.id)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '', description: '', price: '' } })

  const existing = products.data ?? []

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await saveProduct(store.id, {
        name: values.name,
        description: values.description || null,
        price_cents: parseMoneyToCents(values.price) ?? 0,
        category_id: null,
        is_available: true,
        is_active: true,
        image_path: null,
        position: existing.length,
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.products(store.id) })
      reset()
    } catch (error) {
      setFormError(errorMessage(error))
    }
  })

  const goNext = async () => {
    setFormError(null)
    try {
      await update.mutateAsync({ storeId: store.id, values: { onboarding_step: 4 } })
    } catch (error) {
      setFormError(errorMessage(error))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">Cadastre seu primeiro produto</h1>
        <p className="mt-1 text-sm text-muted">
          Comece com o que você mais vende, como a marmita do dia. Fotos, categorias e adicionais você inclui depois no Cardápio.
        </p>
      </div>
      {formError ? <Alert tone="danger">{formError}</Alert> : null}

      {existing.length > 0 ? (
        <ul className="divide-y divide-line rounded-xl border border-line" aria-label="Produtos cadastrados">
          {existing.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-medium">{p.name}</span>
              <span className="text-muted">{formatCents(p.price_cents)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 rounded-xl bg-canvas p-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <Field label="Nome do produto" error={errors.name?.message} required>
            <Input placeholder="Ex.: Marmita de frango" {...register('name')} />
          </Field>
          <Field label="Preço" error={errors.price?.message} required>
            <InputGroup prefix="R$">
              <Input inputMode="decimal" placeholder="18,90" {...register('price')} />
            </InputGroup>
          </Field>
        </div>
        <Field label="Descrição (opcional)" error={errors.description?.message}>
          <Textarea rows={2} placeholder="Arroz, feijão, frango grelhado e salada" {...register('description')} />
        </Field>
        <Button type="submit" variant={existing.length ? 'outline' : 'primary'} loading={isSubmitting} className="self-start">
          {existing.length ? 'Adicionar outro produto' : 'Salvar produto'}
        </Button>
      </form>

      <div className="flex flex-col-reverse items-center gap-3 border-t border-line pt-5 sm:flex-row sm:justify-between">
        {existing.length ? (
          <span />
        ) : (
          <button type="button" onClick={() => void goNext()} className="text-sm font-medium text-muted hover:text-ink">
            Pular esta etapa
          </button>
        )}
        <Button size="lg" onClick={() => void goNext()} loading={update.isPending} disabled={!existing.length} className="w-full sm:w-auto">
          Continuar para a prévia
        </Button>
      </div>
    </div>
  )
}
