import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { OperationForm } from '@/features/stores/components/OperationForm'
import { operationDefaults, operationToUpdate } from '@/features/stores/operation'
import { useUpdateStore } from '@/features/stores/hooks'
import { errorMessage } from '@/lib/errors'
import type { StoreRow } from '@/types/database'

export function StepOperation({ store }: { store: StoreRow }) {
  const update = useUpdateStore()
  const [formError, setFormError] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">Como você atende seus clientes?</h1>
        <p className="mt-1 text-sm text-muted">Você pode ajustar tudo isso depois em Configurações.</p>
      </div>
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      <OperationForm
        defaultValues={operationDefaults(store)}
        onSubmit={async (values) => {
          setFormError(null)
          try {
            await update.mutateAsync({ storeId: store.id, values: { ...operationToUpdate(values), onboarding_step: 3 } })
          } catch (error) {
            setFormError(errorMessage(error))
          }
        }}
        footer={({ isSubmitting }) => (
          <div className="flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
            <Link to="/app" className="text-sm font-medium text-muted hover:text-ink">
              Terminar depois
            </Link>
            <Button type="submit" size="lg" loading={isSubmitting} className="w-full sm:w-auto">
              Continuar
            </Button>
          </div>
        )}
      />
    </div>
  )
}
