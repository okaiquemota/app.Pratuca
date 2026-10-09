import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import LoginPage from './LoginPage'
import SignupPage from './SignupPage'

const api = vi.hoisted(() => ({ signIn: vi.fn(), signUp: vi.fn() }))
vi.mock('../api', () => api)

describe('login', () => {
  beforeEach(() => vi.clearAllMocks())

  it('valida os campos antes de enviar', async () => {
    renderWithProviders(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Informe seu e-mail.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument()
    expect(api.signIn).not.toHaveBeenCalled()
  })

  it('mostra erro traduzido quando as credenciais são inválidas', async () => {
    api.signIn.mockRejectedValueOnce({ message: 'Invalid login credentials' })
    renderWithProviders(<LoginPage />)
    await userEvent.type(screen.getByLabelText('E-mail'), 'dona@exemplo.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-errada')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('E-mail ou senha incorretos.')).toBeInTheDocument()
  })

  it('redireciona para o destino interno após entrar', async () => {
    api.signIn.mockResolvedValueOnce(undefined)
    const { router } = renderWithProviders(<LoginPage />, {
      route: '/entrar?next=%2Fapp%2Fpedidos',
      path: '/entrar',
      extraRoutes: [{ path: '/app/pedidos', element: <p>painel</p> }],
    })
    await userEvent.type(screen.getByLabelText('E-mail'), 'dona@exemplo.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-certa')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/app/pedidos'))
  })
})

describe('cadastro', () => {
  beforeEach(() => vi.clearAllMocks())

  it('exige aceite dos termos e senha com 8 caracteres', async () => {
    renderWithProviders(<SignupPage />)
    await userEvent.type(screen.getByLabelText('Seu nome'), 'Ana')
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com')
    await userEvent.type(screen.getByLabelText('Senha'), '123')
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByText('A senha precisa ter pelo menos 8 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Você precisa aceitar os termos para continuar.')).toBeInTheDocument()
    expect(api.signUp).not.toHaveBeenCalled()
  })

  it('pede confirmação de e-mail quando o Supabase exige', async () => {
    api.signUp.mockResolvedValueOnce({ needsConfirmation: true })
    renderWithProviders(<SignupPage />)
    await userEvent.type(screen.getByLabelText('Seu nome'), 'Ana')
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-forte-123')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByText('Enviamos um link de confirmação')).toBeInTheDocument()
    expect(api.signUp).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ana', email: 'ana@exemplo.com', acceptTerms: true }))
  })
})
