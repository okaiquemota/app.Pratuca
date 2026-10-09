import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Alert, Spinner } from '@/components/ui/Feedback'
import { Field, Input } from '@/components/ui/Field'
import { errorMessage } from '@/lib/errors'
import { updatePassword } from '../api'
import { useAuth } from '../AuthProvider'
import { resetSchema, type ResetValues } from '../schemas'

export default function ResetPasswordPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { password: '', confirm: '' } })

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null)
    try {
      await updatePassword(password)
      navigate('/app', { replace: true })
    } catch (error) {
      setFormError(errorMessage(error))
    }
  })

  return (
    <AuthLayout title="Criar nova senha">
      <title>Nova senha — Pratuca</title>
      {loading ? (
        <Spinner />
      ) : !user ? (
        <Alert tone="warning" title="Link inválido ou expirado" action={<ButtonLink to="/recuperar-senha" variant="outline" size="sm">Pedir novo link</ButtonLink>}>
          Abra o link mais recente enviado para o seu e-mail.
        </Alert>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {formError ? <Alert tone="danger">{formError}</Alert> : null}
          <Field label="Nova senha" hint="Mínimo de 8 caracteres." error={errors.password?.message}>
            <Input type="password" autoComplete="new-password" {...register('password')} />
          </Field>
          <Field label="Confirme a nova senha" error={errors.confirm?.message}>
            <Input type="password" autoComplete="new-password" {...register('confirm')} />
          </Field>
          <Button type="submit" size="lg" loading={isSubmitting}>
            Salvar nova senha
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
