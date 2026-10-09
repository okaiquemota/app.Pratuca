import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { Field, Input } from '@/components/ui/Field'
import { errorMessage } from '@/lib/errors'
import { requestPasswordReset } from '../api'
import { forgotSchema, type ForgotValues } from '../schemas'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } })

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (error) {
      setFormError(errorMessage(error))
    }
  })

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Enviaremos um link para você criar uma nova senha."
      footer={
        <Link to="/entrar" className="font-semibold text-brand-700 hover:underline">
          Voltar para o login
        </Link>
      }
    >
      <title>Recuperar senha — Pratuca</title>
      {sent ? (
        <Alert tone="success" title="Verifique seu e-mail">
          Se existir uma conta com este e-mail, você receberá um link para redefinir a senha.
        </Alert>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {formError ? <Alert tone="danger">{formError}</Alert> : null}
          <Field label="E-mail" error={errors.email?.message}>
            <Input type="email" autoComplete="email" {...register('email')} />
          </Field>
          <Button type="submit" size="lg" loading={isSubmitting}>
            Enviar link
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
