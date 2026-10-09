import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { Field, Input, InputGroup } from '@/components/ui/Field'
import { createStore, isSlugAvailable } from '@/features/stores/api'
import { slugSchema, storeNameSchema } from '@/features/stores/schemas'
import { isValidSlug, slugify } from '@/features/stores/slug'
import { storeUrlPrefix } from '@/features/stores/storeUrl'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { errorCode, errorMessage } from '@/lib/errors'
import { queryKeys } from '@/lib/queryClient'

const schema = z.object({ name: storeNameSchema, slug: slugSchema })
type Values = z.infer<typeof schema>

export function StepBusiness() {
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
    control,
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '', slug: '' } })

  const slug = useWatch({ control, name: 'slug' })

  const debouncedSlug = useDebouncedValue(slug, 450)
  const availability = useQuery({
    queryKey: ['slug-available', debouncedSlug],
    queryFn: () => isSlugAvailable(debouncedSlug),
    enabled: isValidSlug(debouncedSlug),
    staleTime: 10_000,
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const store = await createStore(values.name.trim(), values.slug)
      queryClient.setQueryData(queryKeys.store, store)
    } catch (error) {
      const code = errorCode(error)
      if (code === 'SLUG_TAKEN' || code === 'INVALID_SLUG') setError('slug', { message: errorMessage(error) })
      else setFormError(errorMessage(error))
    }
  })

  const slugStatus =
    !isValidSlug(slug) || slug !== debouncedSlug ? null : availability.isFetching ? (
      <span className="inline-flex items-center gap-1 text-muted">
        <Loader2 className="size-3.5 animate-spin" aria-hidden /> Verificando…
      </span>
    ) : availability.data === true ? (
      <span className="inline-flex items-center gap-1 text-success-700">
        <CheckCircle2 className="size-3.5" aria-hidden /> Endereço disponível
      </span>
    ) : availability.data === false ? (
      <span className="inline-flex items-center gap-1 text-danger-600">
        <XCircle className="size-3.5" aria-hidden /> Endereço em uso. Escolha outro.
      </span>
    ) : null

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">Vamos começar pelo seu negócio</h1>
        <p className="mt-1 text-sm text-muted">Esse é o nome que seus clientes vão ver no cardápio.</p>
      </div>
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      <Field label="Nome do negócio" error={errors.name?.message} required>
        <Input
          placeholder="Ex.: Sabor da Nona"
          autoComplete="organization"
          {...register('name', {
            // sugere o endereço a partir do nome até a pessoa editá-lo manualmente
            onChange: (e: { target: { value: string } }) => {
              if (!slugTouched) setValue('slug', slugify(e.target.value))
            },
          })}
        />
      </Field>
      <Field
        label="Endereço do seu cardápio"
        hint={slugStatus ?? 'Letras minúsculas, números e hífens. Você pode mudar depois.'}
        error={errors.slug?.message}
        required
      >
        <InputGroup prefix={storeUrlPrefix()}>
          <Input
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            {...register('slug', {
              onChange: (e: { target: { value: string } }) => {
                setSlugTouched(true)
                setValue('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
              },
            })}
          />
        </InputGroup>
      </Field>
      <Button type="submit" size="lg" loading={isSubmitting} disabled={availability.data === false && slug === debouncedSlug}>
        Continuar
      </Button>
    </form>
  )
}
