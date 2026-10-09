import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Choice } from '@/components/ui/Choice'
import { Alert, EmptyState } from '@/components/ui/Feedback'
import { Field, Input } from '@/components/ui/Field'
import { errorMessage } from '@/lib/errors'
import { signUp } from '../api'
import { signupSchema, type SignupValues } from '../schemas'

export default function SignupPage() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', acceptTerms: false },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const { needsConfirmation } = await signUp(values)
      if (needsConfirmation) setSentTo(values.email)
      else navigate('/app/comecar', { replace: true })
    } catch (error) {
      setFormError(errorMessage(error, 'Não foi possível criar sua conta. Tente novamente.'))
    }
  })

  if (sentTo) {
    return (
      <AuthLayout title="Confirme seu e-mail">
        <title>Confirme seu e-mail — Pratuca</title>
        <EmptyState
          icon={<MailCheck className="size-6" aria-hidden />}
          title="Enviamos um link de confirmação"
          description={
            <>
              Abra o e-mail enviado para <strong className="text-ink">{sentTo}</strong> e clique no link para ativar sua conta. Depois
              disso, você continua a configuração da sua loja. Não encontrou? Verifique a caixa de spam.
            </>
          }
          action={<ButtonLink to="/entrar" variant="outline">Ir para o login</ButtonLink>}
        />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Crie sua conta"
      subtitle="7 dias de teste para configurar sua loja. Sem comissão por pedido."
      footer={
        <>
          Já tem conta?{' '}
          <Link to="/entrar" className="font-semibold text-brand-700 underline-offset-4 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <title>Criar conta — Pratuca</title>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError ? <Alert tone="danger">{formError}</Alert> : null}
        <Field label="Seu nome" error={errors.name?.message}>
          <Input autoComplete="name" {...register('name')} />
        </Field>
        <Field label="E-mail" error={errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" {...register('email')} />
        </Field>
        <Field label="Senha" hint="Mínimo de 8 caracteres." error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <Choice
            {...register('acceptTerms')}
            aria-invalid={errors.acceptTerms ? true : undefined}
            label={
              <>
                Li e aceito os{' '}
                <Link to="/termos" target="_blank" className="text-brand-700 underline">
                  termos de uso
                </Link>{' '}
                e a{' '}
                <Link to="/privacidade" target="_blank" className="text-brand-700 underline">
                  política de privacidade
                </Link>
                .
              </>
            }
          />
          {errors.acceptTerms ? (
            <p className="text-xs font-medium text-danger-600" role="alert">
              {errors.acceptTerms.message}
            </p>
          ) : null}
        </div>
        <Button type="submit" size="lg" loading={isSubmitting}>
          Criar conta
        </Button>
      </form>
    </AuthLayout>
  )
}
