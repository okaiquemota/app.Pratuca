/** Mantém apenas dígitos. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Telefone brasileiro com DDD (10 ou 11 dígitos), opcionalmente com DDI 55.
 * Retorna somente os dígitos nacionais (sem 55) ou null.
 */
export function normalizeBrazilianPhone(value: string): string | null {
  let digits = onlyDigits(value)
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2)
  }
  if (digits.length !== 10 && digits.length !== 11) return null
  if (digits.startsWith('0')) return null
  return digits
}

/** Formato internacional para WhatsApp (wa.me): 55 + DDD + número. */
export function toWhatsappNumber(value: string): string | null {
  const national = normalizeBrazilianPhone(value)
  return national ? `55${national}` : null
}

/** "11987654321" → "(11) 98765-4321" */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return ''
  let digits = onlyDigits(value)
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2)
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return value
}

/** Máscara progressiva para inputs de telefone. */
export function maskPhoneInput(value: string): string {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
