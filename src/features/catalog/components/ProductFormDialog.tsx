import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Choice } from '@/components/ui/Choice'
import { Dialog } from '@/components/ui/Dialog'
import { Alert, Spinner } from '@/components/ui/Feedback'
import { Field, Input, InputGroup, Select, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/toast'
import { removeStoreImage, uploadStoreImage } from '@/features/stores/api'
import { errorMessage } from '@/lib/errors'
import { centsToInput, parseMoneyToCents } from '@/lib/format'
import { queryKeys } from '@/lib/queryClient'
import type { CategoryRow, ProductRow } from '@/types/database'
import { saveProduct, syncOptionGroups, type OptionGroupWithOptions } from '../api'
import { useOptionGroups } from '../hooks'
import { productSchema, type ProductValues } from '../schemas'
import { ImagePicker } from './ImagePicker'
import { OptionGroupsEditor } from './OptionGroupsEditor'

interface Props {
  storeId: string
  product: ProductRow | null
  categories: CategoryRow[]
  nextPosition: number
  onClose: () => void
}

function toFormValues(product: ProductRow | null, groups: OptionGroupWithOptions[]): ProductValues {
  return {
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product ? centsToInput(product.price_cents) : '',
    category_id: product?.category_id ?? '',
    is_available: product?.is_available ?? true,
    is_active: product?.is_active ?? true,
    option_groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      min_select: g.min_select,
      max_select: g.max_select,
      options: g.product_options.map((o) => ({ id: o.id, name: o.name, price: o.price_cents ? centsToInput(o.price_cents) : '', is_available: o.is_available })),
    })),
  }
}

export function ProductFormDialog(props: Props) {
  const groups = useOptionGroups(props.product?.id)
  const loading = Boolean(props.product) && groups.isPending
  return (
    <Dialog open onClose={props.onClose} title={props.product ? 'Editar produto' : 'Novo produto'} size="lg">
      {loading ? <Spinner /> : groups.isError ? <Alert tone="danger">{errorMessage(groups.error)}</Alert> : <ProductForm {...props} groups={groups.data ?? []} />}
    </Dialog>
  )
}

function ProductForm({ storeId, product, categories, nextPosition, onClose, groups }: Props & { groups: OptionGroupWithOptions[] }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductValues>({ resolver: zodResolver(productSchema), defaultValues: toFormValues(product, groups) })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      let imagePath = imageRemoved ? null : (product?.image_path ?? null)
      if (file) imagePath = await uploadStoreImage(storeId, 'produtos', file)

      const saved = await saveProduct(storeId, {
        id: product?.id,
        name: values.name,
        description: values.description || null,
        price_cents: parseMoneyToCents(values.price) ?? 0,
        category_id: values.category_id || null,
        is_available: values.is_available,
        is_active: values.is_active,
        image_path: imagePath,
        ...(product ? {} : { position: nextPosition }),
      })

      await syncOptionGroups(
        storeId,
        saved.id,
        values.option_groups.map((g) => ({
          id: g.id,
          name: g.name,
          min_select: g.min_select,
          max_select: g.max_select,
          options: g.options.map((o) => ({ id: o.id, name: o.name, price_cents: parseMoneyToCents(o.price) ?? 0, is_available: o.is_available })),
        })),
      )

      if (product?.image_path && product.image_path !== imagePath) void removeStoreImage(product.image_path)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.products(storeId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.optionGroups(saved.id) }),
      ])
      toast.success(product ? 'Produto atualizado.' : 'Produto cadastrado.')
      onClose()
    } catch (error) {
      setFormError(errorMessage(error, 'Não foi possível salvar o produto.'))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field label="Nome" error={errors.name?.message} required>
          <Input placeholder="Ex.: Marmita de frango" {...register('name')} />
        </Field>
        <Field label="Preço" error={errors.price?.message} required>
          <InputGroup prefix="R$">
            <Input inputMode="decimal" placeholder="18,90" {...register('price')} />
          </InputGroup>
        </Field>
      </div>
      <Field label="Descrição" error={errors.description?.message} hint="Ingredientes, tamanho, acompanhamentos.">
        <Textarea rows={2} {...register('description')} />
      </Field>
      <Field label="Categoria">
        <Select {...register('category_id')}>
          <option value="">Sem categoria</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.is_active ? '' : ' (oculta)'}
            </option>
          ))}
        </Select>
      </Field>
      <ImagePicker
        currentPath={product?.image_path ?? null}
        file={file}
        removed={imageRemoved}
        onSelect={(f) => {
          setFile(f)
          if (f) setImageRemoved(false)
        }}
        onRemove={() => setImageRemoved(true)}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <Choice label="Disponível agora" description="Desmarque se acabou hoje (aparece como esgotado)." {...register('is_available')} />
        <Choice label="Ativo no cardápio" description="Desmarque para esconder sem excluir." {...register('is_active')} />
      </div>
      <OptionGroupsEditor control={control} register={register} errors={errors} />
      <div className="sticky bottom-0 -mx-5 -mb-4 flex flex-col-reverse gap-2 border-t border-line bg-white px-5 py-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
        <Button type="submit" loading={isSubmitting}>Salvar produto</Button>
      </div>
    </form>
  )
}
