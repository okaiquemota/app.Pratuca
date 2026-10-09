import { onlyDigits } from '@/lib/phone'

/**
 * Link oficial de clique para conversar: https://wa.me/<número>?text=<mensagem>
 * O número deve estar em formato internacional, apenas dígitos (ex.: 5511987654321).
 */
export function buildWaMeLink(phone: string, message?: string): string | null {
  const digits = onlyDigits(phone)
  if (digits.length < 10 || digits.length > 15) return null
  const base = `https://wa.me/${digits}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
