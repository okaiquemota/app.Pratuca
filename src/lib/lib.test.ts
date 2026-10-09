import { describe, expect, it } from 'vitest'
import { slugify, isValidSlug } from '@/features/stores/slug'
import { describeAccess } from '@/features/billing/plan'
import { centsToInput, formatCents, formatOrderNumber, parseMoneyToCents } from './format'
import { formatPhone, maskPhoneInput, normalizeBrazilianPhone, toWhatsappNumber } from './phone'
import { localDateString, zonedDayRange } from './timezone'
import { errorMessage } from './errors'

describe('moeda (pt-BR / BRL)', () => {
  it('formata centavos', () => {
    expect(formatCents(1890)).toBe('R$ 18,90')
    expect(formatCents(123456)).toBe('R$ 1.234,56')
  })
  it('converte texto em centavos sem erros de ponto flutuante', () => {
    expect(parseMoneyToCents('18,90')).toBe(1890)
    expect(parseMoneyToCents('R$ 1.234,56')).toBe(123456)
    expect(parseMoneyToCents('19.9')).toBe(1990)
    expect(parseMoneyToCents('0,29')).toBe(29)
    expect(parseMoneyToCents('abc')).toBeNull()
    expect(parseMoneyToCents('1,234')).toBeNull()
    expect(centsToInput(1890)).toBe('18,90')
  })
  it('formata número do pedido', () => {
    expect(formatOrderNumber(42)).toBe('#0042')
  })
})

describe('telefone', () => {
  it('normaliza números brasileiros', () => {
    expect(normalizeBrazilianPhone('(11) 98765-4321')).toBe('11987654321')
    expect(normalizeBrazilianPhone('+55 11 98765-4321')).toBe('11987654321')
    expect(normalizeBrazilianPhone('1133334444')).toBe('1133334444')
    expect(normalizeBrazilianPhone('98765-4321')).toBeNull()
    expect(toWhatsappNumber('11987654321')).toBe('5511987654321')
  })
  it('formata e mascara', () => {
    expect(formatPhone('5511987654321')).toBe('(11) 98765-4321')
    expect(maskPhoneInput('1198765')).toBe('(11) 9876-5')
    expect(maskPhoneInput('11987654321')).toBe('(11) 98765-4321')
  })
})

describe('slug', () => {
  it('gera slugs válidos a partir do nome', () => {
    expect(slugify('Marmitaria da Nona Ção!')).toBe('marmitaria-da-nona-cao')
    expect(slugify('  --Sabor  &  Cia-- ')).toBe('sabor-cia')
  })
  it('valida formato e palavras reservadas', () => {
    expect(isValidSlug('sabor-da-nona')).toBe(true)
    expect(isValidSlug('ab')).toBe(false)
    expect(isValidSlug('admin')).toBe(false)
    expect(isValidSlug('a--b')).toBe(false)
    expect(isValidSlug('-abc')).toBe(false)
  })
})

describe('fuso horário', () => {
  it('calcula a data local de São Paulo', () => {
    expect(localDateString(new Date('2026-10-10T02:30:00Z'), 'America/Sao_Paulo')).toBe('2026-10-09')
  })
  it('calcula o intervalo de um dia local em UTC', () => {
    expect(zonedDayRange('2026-10-09', 'America/Sao_Paulo')).toEqual({
      from: '2026-10-09T03:00:00.000Z',
      to: '2026-10-10T03:00:00.000Z',
    })
  })
})

describe('estado da assinatura (exibição)', () => {
  const now = new Date('2026-10-09T12:00:00Z')
  it('teste em andamento e vencido', () => {
    expect(describeAccess({ status: 'trialing', trial_ends_at: '2026-10-12T12:00:00Z', current_period_end: null }, now)).toMatchObject({ kind: 'trial', daysLeft: 3 })
    expect(describeAccess({ status: 'trialing', trial_ends_at: '2026-10-08T12:00:00Z', current_period_end: null }, now)).toEqual({ kind: 'blocked', reason: 'trial_ended' })
  })
  it('carência após vencimento', () => {
    expect(describeAccess({ status: 'past_due', trial_ends_at: null, current_period_end: '2026-10-08T12:00:00Z' }, now).kind).toBe('grace')
    expect(describeAccess({ status: 'past_due', trial_ends_at: null, current_period_end: '2026-10-01T12:00:00Z' }, now).kind).toBe('blocked')
  })
})

describe('mensagens de erro', () => {
  it('traduz códigos do banco e do Supabase Auth', () => {
    expect(errorMessage({ message: 'STORE_CLOSED' })).toMatch(/fechada/)
    expect(errorMessage({ message: 'Invalid login credentials' })).toBe('E-mail ou senha incorretos.')
    expect(errorMessage({ message: 'qualquer coisa interna' })).toBe('Algo deu errado. Tente novamente.')
  })
})
