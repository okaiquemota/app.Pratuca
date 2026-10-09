import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import { StepBusiness } from './steps/StepBusiness'

const api = vi.hoisted(() => ({ createStore: vi.fn(), isSlugAvailable: vi.fn() }))
vi.mock('@/features/stores/api', () => api)

describe('onboarding — etapa do negócio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.isSlugAvailable.mockResolvedValue(true)
  })

  it('sugere o endereço a partir do nome e cria a loja', async () => {
    api.createStore.mockResolvedValueOnce({ id: 's1', slug: 'sabor-da-nona', onboarding_step: 2 })
    const { queryClient } = renderWithProviders(<StepBusiness />)
    await userEvent.type(screen.getByLabelText(/Nome do negócio/), 'Sabor da Noná')
    expect(screen.getByLabelText(/Endereço do seu cardápio/)).toHaveValue('sabor-da-nona')
    expect(await screen.findByText('Endereço disponível')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    await waitFor(() => expect(api.createStore).toHaveBeenCalledWith('Sabor da Noná', 'sabor-da-nona'))
    expect(queryClient.getQueryData(['store'])).toMatchObject({ id: 's1' })
  })

  it('mostra erro no campo quando o endereço já está em uso', async () => {
    api.createStore.mockRejectedValueOnce({ message: 'SLUG_TAKEN' })
    renderWithProviders(<StepBusiness />)
    await userEvent.type(screen.getByLabelText(/Nome do negócio/), 'Marmitaria Boa')
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByText('Este endereço já está em uso. Escolha outro.')).toBeInTheDocument()
  })

  it('bloqueia endereços reservados', async () => {
    renderWithProviders(<StepBusiness />)
    await userEvent.type(screen.getByLabelText(/Nome do negócio/), 'Admin')
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByText('Este endereço é reservado. Escolha outro.')).toBeInTheDocument()
    expect(api.createStore).not.toHaveBeenCalled()
  })
})
