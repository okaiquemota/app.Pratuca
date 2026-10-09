import { Minus, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Textarea } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { formatCents } from '@/lib/format'
import { publicImageUrl } from '@/lib/supabase'
import { buildCartOptions, MAX_QUANTITY, validateSelection, type CartLine } from '../cart'
import type { PublicProduct } from '../types'

interface Props {
  product: PublicProduct
  canOrder: boolean
  onClose: () => void
  onAdd: (line: Omit<CartLine, 'lineId'>) => void
}

export function ProductDialog({ product, canOrder, onClose, onAdd }: Props) {
  const [selected, setSelected] = useState<string[]>(() =>
    // pré-seleciona a única opção disponível de grupos obrigatórios de escolha única
    product.option_groups.flatMap((g) => {
      const available = g.options.filter((o) => o.is_available)
      return g.min_select === 1 && g.max_select === 1 && available.length === 1 ? [available[0]!.id] : []
    }),
  )
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const image = publicImageUrl(product.image_path)

  const validation = validateSelection(product.option_groups, selected)
  const options = useMemo(() => buildCartOptions(product, selected), [product, selected])
  const unit = product.price_cents + options.reduce((s, o) => s + o.priceCents, 0)

  const toggle = (groupId: string, optionId: string, single: boolean) => {
    const group = product.option_groups.find((g) => g.id === groupId)!
    const groupIds = group.options.map((o) => o.id)
    setSelected((current) => {
      if (single) return [...current.filter((id) => !groupIds.includes(id)), optionId]
      if (current.includes(optionId)) return current.filter((id) => id !== optionId)
      const inGroup = current.filter((id) => groupIds.includes(id)).length
      if (inGroup >= group.max_select) return current
      return [...current, optionId]
    })
  }

  const add = () => {
    if (!validation.valid) {
      setShowErrors(true)
      return
    }
    onAdd({ productId: product.id, name: product.name, unitPriceCents: product.price_cents, options, quantity, notes: notes.trim().slice(0, 200) })
    onClose()
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={product.name}
      footer={
        canOrder && product.is_available ? (
          <div className="flex w-full items-center gap-3">
            <div className="flex items-center rounded-xl border border-line" role="group" aria-label="Quantidade">
              <Button variant="ghost" size="icon" aria-label="Diminuir quantidade" disabled={quantity <= 1} onClick={() => setQuantity((q) => q - 1)}>
                <Minus className="size-4" aria-hidden />
              </Button>
              <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">{quantity}</span>
              <Button variant="ghost" size="icon" aria-label="Aumentar quantidade" disabled={quantity >= MAX_QUANTITY} onClick={() => setQuantity((q) => q + 1)}>
                <Plus className="size-4" aria-hidden />
              </Button>
            </div>
            <Button className="flex-1" onClick={add}>
              Adicionar · {formatCents(unit * quantity)}
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        )
      }
    >
      <div className="flex flex-col gap-5">
        {image ? <img src={image} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" /> : null}
        <div>
          {product.description ? <p className="text-sm text-muted">{product.description}</p> : null}
          <p className="mt-2 text-lg font-bold">{formatCents(product.price_cents)}</p>
          {!product.is_available ? <p className="mt-1 text-sm font-semibold text-warning-700">Esgotado no momento</p> : null}
        </div>

        {product.option_groups.map((group) => {
          const single = group.max_select === 1
          const error = showErrors ? validation.errors[group.id] : undefined
          const rule =
            group.min_select > 0
              ? single ? 'Obrigatório · escolha 1' : `Obrigatório · ${group.min_select} a ${group.max_select}`
              : single ? 'Opcional · até 1' : `Opcional · até ${group.max_select}`
          return (
            <fieldset key={group.id} className="flex flex-col gap-2" aria-describedby={error ? `erro-${group.id}` : undefined}>
              <legend className="flex w-full items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2">
                <span className="font-semibold">{group.name}</span>
                <span className={cn('text-xs', group.min_select > 0 ? 'font-semibold text-brand-700' : 'text-muted')}>{rule}</span>
              </legend>
              {group.options.map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-line px-3 py-2',
                    'has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50',
                    !option.is_available && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type={single ? 'radio' : 'checkbox'}
                      name={`grupo-${group.id}`}
                      className="size-5 accent-brand-600"
                      checked={selected.includes(option.id)}
                      disabled={!option.is_available || !canOrder}
                      onChange={() => toggle(group.id, option.id, single)}
                    />
                    <span className="text-sm">
                      {option.name}
                      {!option.is_available ? ' (esgotado)' : ''}
                    </span>
                  </span>
                  {option.price_cents ? <span className="text-sm text-muted">+ {formatCents(option.price_cents)}</span> : null}
                </label>
              ))}
              {error ? <p id={`erro-${group.id}`} role="alert" className="text-xs font-medium text-danger-600">{error}</p> : null}
            </fieldset>
          )
        })}

        {canOrder && product.is_available ? (
          <Field label="Alguma observação?" hint={`${notes.length}/200`}>
            <Textarea rows={2} maxLength={200} placeholder="Ex.: sem cebola, mais arroz" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        ) : null}
      </div>
    </Dialog>
  )
}
