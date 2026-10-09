import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Field, Input, InputGroup } from '@/components/ui/Field'
import type { ProductValues } from '../schemas'

interface Props {
  control: Control<ProductValues>
  register: UseFormRegister<ProductValues>
  errors: FieldErrors<ProductValues>
}

/**
 * Grupos de opções e adicionais. Ex.:
 *   "Escolha a carne" (mín. 1, máx. 1): Frango, Carne, Linguiça
 *   "Adicionais" (mín. 0, máx. 3): Ovo +R$ 2,00, Farofa +R$ 1,50
 */
export function OptionGroupsEditor({ control, register, errors }: Props) {
  const groups = useFieldArray({ control, name: 'option_groups' })

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium">Opções e adicionais</legend>
      <p className="-mt-1 text-xs text-muted">
        Use para escolhas do cliente, como "Escolha a carne" (obrigatório) ou "Adicionais" (opcional, com preço).
      </p>
      {groups.fields.map((group, index) => (
        <div key={group.id} className="rounded-xl border border-line p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_6rem_6rem_auto] sm:items-start">
            <Field label="Nome do grupo" error={errors.option_groups?.[index]?.name?.message}>
              <Input placeholder="Ex.: Escolha a carne" {...register(`option_groups.${index}.name`)} />
            </Field>
            <Field label="Mínimo" hint="0 = opcional" error={errors.option_groups?.[index]?.min_select?.message}>
              <Input type="number" inputMode="numeric" min={0} max={10} {...register(`option_groups.${index}.min_select`, { valueAsNumber: true })} />
            </Field>
            <Field label="Máximo" error={errors.option_groups?.[index]?.max_select?.message}>
              <Input type="number" inputMode="numeric" min={1} max={20} {...register(`option_groups.${index}.max_select`, { valueAsNumber: true })} />
            </Field>
            <Button variant="ghost" size="icon" className="sm:mt-6" aria-label={`Remover grupo ${index + 1}`} onClick={() => groups.remove(index)}>
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
          <OptionsList groupIndex={index} control={control} register={register} errors={errors} />
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        icon={<Plus className="size-4" aria-hidden />}
        disabled={groups.fields.length >= 10}
        onClick={() =>
          groups.append({ name: '', min_select: 0, max_select: 1, options: [{ name: '', price: '', is_available: true }] })
        }
      >
        Adicionar grupo de opções
      </Button>
    </fieldset>
  )
}

function OptionsList({ groupIndex, control, register, errors }: Props & { groupIndex: number }) {
  const options = useFieldArray({ control, name: `option_groups.${groupIndex}.options` })
  const groupErrors = errors.option_groups?.[groupIndex]
  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="text-xs font-semibold text-muted uppercase">Opções</p>
      {options.fields.map((option, index) => (
        <div key={option.id} className="grid grid-cols-[1fr_7rem_auto] items-start gap-2 sm:grid-cols-[1fr_8rem_auto_auto]">
          <Field label={<span className="sr-only">Nome da opção {index + 1}</span>} error={groupErrors?.options?.[index]?.name?.message}>
            <Input placeholder="Ex.: Frango" {...register(`option_groups.${groupIndex}.options.${index}.name`)} />
          </Field>
          <Field label={<span className="sr-only">Preço adicional da opção {index + 1}</span>} error={groupErrors?.options?.[index]?.price?.message}>
            <InputGroup prefix="+R$">
              <Input inputMode="decimal" placeholder="0,00" {...register(`option_groups.${groupIndex}.options.${index}.price`)} />
            </InputGroup>
          </Field>
          <label className="col-span-2 flex min-h-11 items-center gap-2 text-sm sm:col-span-1">
            <input type="checkbox" className="size-4 accent-brand-600" {...register(`option_groups.${groupIndex}.options.${index}.is_available`)} />
            Disponível
          </label>
          <Button variant="ghost" size="icon" aria-label={`Remover opção ${index + 1}`} onClick={() => options.remove(index)}>
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      ))}
      {groupErrors?.options?.message || groupErrors?.options?.root?.message ? (
        <p role="alert" className="text-xs font-medium text-danger-600">
          {groupErrors.options.message ?? groupErrors.options.root?.message}
        </p>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        icon={<Plus className="size-4" aria-hidden />}
        disabled={options.fields.length >= 30}
        onClick={() => options.append({ name: '', price: '', is_available: true })}
      >
        Adicionar opção
      </Button>
    </div>
  )
}
