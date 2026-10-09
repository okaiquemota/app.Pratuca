const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const integer = new Intl.NumberFormat('pt-BR')

/** 1890 → "R$ 18,90" (valores sempre em centavos) */
export function formatCents(cents: number): string {
  return currency.format(cents / 100).replace(/\u00a0/g, ' ')
}

export function formatNumber(value: number): string {
  return integer.format(value)
}

/** "18,90" | "18.90" | "R$ 1.234,56" → centavos. Retorna null se inválido. */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, '').trim()
  if (!cleaned) return null
  let normalized = cleaned
  if (cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  }
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null
  return Math.round(Number(normalized) * 100)
}

/** centavos → "18,90" (para campos de formulário) */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return ''
  return (cents / 100).toFixed(2).replace('.', ',')
}

export function formatDateTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(iso))
}

export function formatTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(iso))
}

export function formatDate(isoOrDate: string | Date, timeZone?: string): string {
  const date = typeof isoOrDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)
    ? new Date(`${isoOrDate}T12:00:00Z`)
    : new Date(isoOrDate)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: typeof isoOrDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate) ? 'UTC' : timeZone,
  }).format(date)
}

/** Número legível do pedido: 42 → "#0042" */
export function formatOrderNumber(n: number): string {
  return `#${String(n).padStart(4, '0')}`
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`
}
