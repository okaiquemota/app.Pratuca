import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Choice } from '@/components/ui/Choice'
import { Field, Input, InputGroup } from '@/components/ui/Field'
import { PAYMENT_LABEL, PAYMENT_METHODS } from '@/lib/labels'
import { maskPhoneInput } from '@/lib/phone'
import { operationSchema, type OperationValues } from '../schemas'

interface Props {
  defaultValues: OperationValues
  onSubmit: (values: OperationValues) => Promise<void>
  footer: (state: { isSubmitting: boolean }) => ReactNode
}

/** WhatsApp, modalidades (entrega/retirada), taxa, pedido mínimo e pagamentos. */
export function OperationForm({ defaultValues, onSubmit, footer }: Props) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OperationValues>({ resolver: zodResolver(operationSchema), defaultValues })
  const acceptsDelivery = useWatch({ control, name: 'accepts_delivery' })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <Controller
        control={control}
        name="whatsapp"
        render={({ field }) => (
          <Field
            label="WhatsApp para receber pedidos"
            hint="Os clientes vão enviar o resumo do pedido para este número."
            error={errors.whatsapp?.message}
            required
          >
            <Input
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(11) 98765-4321"
              value={field.value}
              onBlur={field.onBlur}
              ref={field.ref}
              onChange={(e) => field.onChange(maskPhoneInput(e.target.value))}
            />
          </Field>
        )}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Como você atende?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <Choice label="Entrega" description="Você leva até o cliente" {...register('accepts_delivery')} />
          <Choice label="Retirada" description="O cliente busca no local" {...register('accepts_pickup')} />
        </div>
        {errors.accepts_pickup ? (
          <p className="text-xs font-medium text-danger-600" role="alert">
            {errors.accepts_pickup.message}
          </p>
        ) : null}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {acceptsDelivery ? (
          <Field label="Taxa de entrega" hint="Deixe em branco para entrega grátis." error={errors.delivery_fee?.message}>
            <InputGroup prefix="R$">
              <Input inputMode="decimal" placeholder="0,00" {...register('delivery_fee')} />
            </InputGroup>
          </Field>
        ) : null}
        <Field label="Pedido mínimo (opcional)" hint="Valor dos itens, sem a taxa." error={errors.min_order?.message}>
          <InputGroup prefix="R$">
            <Input inputMode="decimal" placeholder="0,00" {...register('min_order')} />
          </InputGroup>
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Formas de pagamento aceitas</legend>
        <p className="mb-3 text-xs text-muted">O pagamento é combinado entre você e o cliente. A Pratuca não processa pagamentos dos pedidos.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PAYMENT_METHODS.map((method) => (
            <Choice key={method} label={PAYMENT_LABEL[method]} value={method} {...register('payment_methods')} />
          ))}
        </div>
        {errors.payment_methods ? (
          <p className="mt-2 text-xs font-medium text-danger-600" role="alert">
            {errors.payment_methods.message}
          </p>
        ) : null}
      </fieldset>

      {footer({ isSubmitting })}
    </form>
  )
}
