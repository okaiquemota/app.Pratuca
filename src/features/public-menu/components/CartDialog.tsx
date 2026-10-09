import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState, type Dispatch } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Choice } from '@/components/ui/Choice'
import { Dialog } from '@/components/ui/Dialog'
import { Alert, EmptyState } from '@/components/ui/Feedback'
import { Field, Input, InputGroup, Textarea } from '@/components/ui/Field'
import { errorCode, errorMessage } from '@/lib/errors'
import { formatCents, parseMoneyToCents } from '@/lib/format'
import { FULFILLMENT_LABEL, PAYMENT_LABEL } from '@/lib/labels'
import { maskPhoneInput, normalizeBrazilianPhone } from '@/lib/phone'
import { createPublicOrder } from '../api'
import { calculateTotals, lineTotalCents, MAX_QUANTITY, toOrderItems, type CartAction, type CartState } from '../cart'
import { checkoutSchema, type CheckoutValues } from '../checkoutSchema'
import type { PlacedOrder, PublicStore } from '../types'

interface Props {
  store: PublicStore
  cart: CartState
  dispatch: Dispatch<CartAction>
  onClose: () => void
  onPlaced: (order: PlacedOrder, customerPhone: string) => void
  /** Recarrega o cardápio (ex.: preços mudaram). */
  onMenuOutdated: () => Promise<void>
}

export function CartDialog({ store, cart, dispatch, onClose, onPlaced, onMenuOutdated }: Props) {
  const [step, setStep] = useState<'cart' | 'checkout'>('cart')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const defaultFulfillment = store.accepts_delivery ? 'delivery' : 'pickup'

  // Chave de idempotência: a mesma enquanto o carrinho não muda. Repetir o
  // envio (clique duplo, rede instável) nunca cria dois pedidos.
  const idempotency = useRef<{ key: string; signature: string } | null>(null)
  const cartSignature = JSON.stringify(toOrderItems(cart))

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: '', phone: '', fulfillment: defaultFulfillment, street: '', number: '', complement: '', neighborhood: '', reference: '',
      payment_method: store.payment_methods.length === 1 ? store.payment_methods[0] : '', change_for: '', notes: '',
    },
  })
  const fulfillment = useWatch({ control, name: 'fulfillment' })
  const payment = useWatch({ control, name: 'payment_method' })

  const totals = useMemo(
    () => calculateTotals(cart, { fulfillment: step === 'checkout' ? fulfillment : null, deliveryFeeCents: store.delivery_fee_cents, minOrderCents: store.min_order_cents }),
    [cart, fulfillment, step, store.delivery_fee_cents, store.min_order_cents],
  )

  const onValid = async (values: CheckoutValues) => {
    setSubmitError(null)
    if (!idempotency.current || idempotency.current.signature !== `${cartSignature}|${JSON.stringify(values)}`) {
      idempotency.current = { key: crypto.randomUUID(), signature: `${cartSignature}|${JSON.stringify(values)}` }
    }
    const phone = normalizeBrazilianPhone(values.phone) ?? values.phone
    try {
      const order = await createPublicOrder(store.slug, idempotency.current.key, {
        customer: { name: values.name, phone },
        fulfillment: values.fulfillment,
        address:
          values.fulfillment === 'delivery'
            ? { street: values.street, number: values.number, complement: values.complement, neighborhood: values.neighborhood, reference: values.reference }
            : null,
        payment_method: values.payment_method,
        change_for_cents: values.payment_method === 'cash' && values.change_for ? parseMoneyToCents(values.change_for) : null,
        notes: values.notes || null,
        expected_total_cents: totals.totalCents,
        items: toOrderItems(cart),
      })
      idempotency.current = null
      onPlaced(order, phone)
    } catch (error) {
      const code = errorCode(error)
      if (code === 'PRICE_CHANGED' || code === 'PRODUCT_UNAVAILABLE' || code === 'OPTION_UNAVAILABLE' || code === 'INVALID_OPTIONS') {
        await onMenuOutdated()
        setStep('cart')
      }
      setSubmitError(errorMessage(error, 'Não foi possível enviar o pedido. Verifique sua conexão e tente novamente.'))
    }
  }

  const summary = (
    <dl className="space-y-1 text-sm">
      <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatCents(totals.subtotalCents)}</dd></div>
      {step === 'checkout' && fulfillment === 'delivery' ? (
        <div className="flex justify-between"><dt className="text-muted">Taxa de entrega</dt><dd className="tabular-nums">{totals.deliveryFeeCents ? formatCents(totals.deliveryFeeCents) : 'Grátis'}</dd></div>
      ) : null}
      <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{formatCents(totals.totalCents)}</dd></div>
    </dl>
  )

  if (step === 'cart') {
    return (
      <Dialog
        open
        onClose={onClose}
        title="Seu pedido"
        footer={
          cart.lines.length ? (
            <div className="flex w-full flex-col gap-3">
              {totals.belowMinimum ? (
                <p className="text-sm text-warning-700" role="status">
                  Pedido mínimo de {formatCents(store.min_order_cents ?? 0)}. Faltam {formatCents(totals.missingForMinimumCents)}.
                </p>
              ) : null}
              <Button size="lg" disabled={totals.belowMinimum || !store.accepting_orders} onClick={() => { setSubmitError(null); setStep('checkout') }}>
                Continuar · {formatCents(totals.subtotalCents)}
              </Button>
            </div>
          ) : undefined
        }
      >
        {submitError ? <Alert tone="warning" className="mb-4">{submitError}</Alert> : null}
        {cart.lines.length === 0 ? (
          <EmptyState icon={<ShoppingBag className="size-6" aria-hidden />} title="Seu carrinho está vazio" description="Escolha os itens no cardápio." action={<Button variant="outline" onClick={onClose}>Ver cardápio</Button>} />
        ) : (
          <div className="flex flex-col gap-4">
            <ul className="divide-y divide-line">
              {cart.lines.map((line) => (
                <li key={line.lineId} className="flex gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{line.name}</p>
                    {line.options.map((o) => (
                      <p key={o.id} className="text-xs text-muted">
                        {o.groupName}: {o.name}{o.priceCents ? ` (+${formatCents(o.priceCents)})` : ''}
                      </p>
                    ))}
                    {line.notes ? <p className="text-xs text-muted">Obs.: {line.notes}</p> : null}
                    <p className="mt-1 text-sm font-semibold tabular-nums">{formatCents(lineTotalCents(line))}</p>
                  </div>
                  <div className="flex items-center self-center rounded-xl border border-line" role="group" aria-label={`Quantidade de ${line.name}`}>
                    <Button variant="ghost" size="icon" aria-label={line.quantity === 1 ? `Remover ${line.name}` : `Diminuir ${line.name}`} onClick={() => dispatch({ type: 'setQuantity', lineId: line.lineId, quantity: line.quantity - 1 })}>
                      {line.quantity === 1 ? <Trash2 className="size-4" aria-hidden /> : <Minus className="size-4" aria-hidden />}
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
                    <Button variant="ghost" size="icon" aria-label={`Aumentar ${line.name}`} disabled={line.quantity >= MAX_QUANTITY} onClick={() => dispatch({ type: 'setQuantity', lineId: line.lineId, quantity: line.quantity + 1 })}>
                      <Plus className="size-4" aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            {summary}
          </div>
        )}
      </Dialog>
    )
  }

  return (
    <Dialog open onClose={onClose} title="Finalizar pedido" description="Sem cadastro. Seus dados vão apenas para esta loja.">
      <form onSubmit={(e) => void handleSubmit(onValid)(e)} noValidate className="flex flex-col gap-5">
        <button type="button" onClick={() => setStep('cart')} className="inline-flex items-center gap-1 self-start text-sm font-medium text-brand-700 hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> Voltar ao carrinho
        </button>
        {submitError ? <Alert tone="danger">{submitError}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Seu nome" error={errors.name?.message} required>
            <Input autoComplete="name" {...register('name')} />
          </Field>
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <Field label="Telefone / WhatsApp" error={errors.phone?.message} required>
                <Input type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(11) 98765-4321" value={field.value} ref={field.ref} onBlur={field.onBlur} onChange={(e) => field.onChange(maskPhoneInput(e.target.value))} />
              </Field>
            )}
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Como você quer receber?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {store.accepts_delivery ? (
              <Choice type="radio" value="delivery" label={FULFILLMENT_LABEL.delivery} description={store.delivery_fee_cents ? `Taxa de ${formatCents(store.delivery_fee_cents)}` : 'Entrega grátis'} {...register('fulfillment')} />
            ) : null}
            {store.accepts_pickup ? (
              <Choice type="radio" value="pickup" label={FULFILLMENT_LABEL.pickup} description={store.address ? store.address : 'Combine o local com a loja'} {...register('fulfillment')} />
            ) : null}
          </div>
        </fieldset>

        {fulfillment === 'delivery' ? (
          <fieldset className="grid gap-4 sm:grid-cols-[1fr_7rem]">
            <legend className="sr-only">Endereço de entrega</legend>
            <Field label="Rua" error={errors.street?.message} required>
              <Input autoComplete="address-line1" {...register('street')} />
            </Field>
            <Field label="Número" error={errors.number?.message} required>
              <Input inputMode="numeric" {...register('number')} />
            </Field>
            <Field label="Bairro" error={errors.neighborhood?.message} required>
              <Input autoComplete="address-level3" {...register('neighborhood')} />
            </Field>
            <Field label="Complemento" error={errors.complement?.message}>
              <Input autoComplete="address-line2" placeholder="Apto, bloco" {...register('complement')} />
            </Field>
            <Field label="Ponto de referência" error={errors.reference?.message} className="sm:col-span-2">
              <Input {...register('reference')} />
            </Field>
          </fieldset>
        ) : null}

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Forma de pagamento</legend>
          <p className="mb-2 text-xs text-muted">O pagamento é feito diretamente com a loja, na entrega ou retirada.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {store.payment_methods.map((m) => (
              <Choice key={m} type="radio" value={m} label={PAYMENT_LABEL[m]} {...register('payment_method')} />
            ))}
          </div>
          {errors.payment_method ? <p role="alert" className="mt-2 text-xs font-medium text-danger-600">{errors.payment_method.message}</p> : null}
        </fieldset>

        {payment === 'cash' ? (
          <Field label="Troco para quanto? (opcional)" error={errors.change_for?.message}>
            <InputGroup prefix="R$">
              <Input inputMode="decimal" placeholder="50,00" {...register('change_for')} />
            </InputGroup>
          </Field>
        ) : null}

        <Field label="Observações do pedido (opcional)" error={errors.notes?.message}>
          <Textarea rows={2} maxLength={500} {...register('notes')} />
        </Field>

        <div className="rounded-xl bg-canvas p-4">{summary}</div>

        <Button type="submit" size="lg" loading={isSubmitting} disabled={!store.accepting_orders}>
          {isSubmitting ? 'Enviando pedido…' : `Fazer pedido · ${formatCents(totals.totalCents)}`}
        </Button>
        <p className="text-center text-xs text-muted">
          O pedido é registrado na loja ao confirmar. Depois, você poderá enviar o resumo pelo WhatsApp.
        </p>
      </form>
    </Dialog>
  )
}
