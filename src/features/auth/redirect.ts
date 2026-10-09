/** Evita redirecionamento aberto: só aceita caminhos internos. */
export function safeNext(next: string | null): string {
  if (next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')) return next
  return '/app'
}
