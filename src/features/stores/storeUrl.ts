import { env } from '@/lib/env'

export function storePublicUrl(slug: string): string {
  return `${env.siteUrl}/loja/${slug}`
}

export function storeUrlPrefix(): string {
  return `${env.siteUrl.replace(/^https?:\/\//, '')}/loja/`
}
