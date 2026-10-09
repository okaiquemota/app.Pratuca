import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { Field, Input } from '@/components/ui/Field'
import { errorMessage } from '@/lib/errors'
import { signIn } from '../api'
import { safeNext } from '../redirect'
import { loginSchema, type LoginValues } from '../schemas'

export default function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await signIn(values.email, values.password)
      navigate(safeNext(params.get('next')), { replace: true })
    } catch (error) {
      setFormError(errorMessage(error, 'Não foi possível entrar. Tente novamente.'))
    }
  })

  return (
    <AuthLayout
      title="Entrar na Pratuca"
      subtitle="Acesse o painel da sua loja."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link to="/criar-conta" className="font-semibold text-brand-700 underline-offset-4 hover:underline">
            Criar conta grátis
          </Link>
        </>
      }
    >
      <title>Entrar — Pratuca</title>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError ? <Alert tone="danger">{formError}</Alert> : null}
        <Field label="E-mail" error={errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" {...register('email')} />
        </Field>
        <Field label="Senha" error={errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register('password')} />
        </Field>
        <Link to="/recuperar-senha" className="self-end text-sm font-medium text-brand-700 hover:underline">
          Esqueci minha senha
        </Link>
        <Button type="submit" size="lg" loading={isSubmitting}>
          Entrar
        </Button>
      </form>
    </AuthLayout>
  )
}
