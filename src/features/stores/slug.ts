/** Mantido em sincronia com private.is_valid_slug (banco). */
export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'app', 'ajuda', 'assinatura', 'auth', 'cardapio', 'conta', 'criar-conta',
  'entrar', 'login', 'loja', 'lojas', 'movcode', 'pedido', 'pedidos', 'pratuca', 'precos',
  'privacidade', 'suporte', 'termos', 'www',
])

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/

/** "Marmitaria da Nona Ção!" → "marmitaria-da-nona-cao" */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '')
}

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !slug.includes('--') && !RESERVED_SLUGS.has(slug)
}
