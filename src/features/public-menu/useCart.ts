import { useEffect, useReducer } from 'react'
import { cartReducer, emptyCart, type CartLine, type CartState } from './cart'

const storageKey = (slug: string) => `pratuca:carrinho:${slug}`

function load(slug: string): CartState {
  try {
    const raw = window.localStorage.getItem(storageKey(slug))
    if (!raw) return emptyCart
    const parsed = JSON.parse(raw) as { lines?: CartLine[]; savedAt?: number }
    // carrinhos com mais de 12 h são descartados (o cardápio muda todo dia)
    if (!parsed.savedAt || Date.now() - parsed.savedAt > 12 * 3_600_000 || !Array.isArray(parsed.lines)) return emptyCart
    return { lines: parsed.lines.filter((l) => typeof l.productId === 'string' && Number.isInteger(l.quantity)) }
  } catch {
    return emptyCart
  }
}

/** Carrinho com persistência local (conveniência do aparelho do cliente). */
export function useCart(slug: string) {
  const [state, dispatch] = useReducer(cartReducer, slug, load)
  useEffect(() => {
    try {
      if (state.lines.length) window.localStorage.setItem(storageKey(slug), JSON.stringify({ lines: state.lines, savedAt: Date.now() }))
      else window.localStorage.removeItem(storageKey(slug))
    } catch {
      /* armazenamento indisponível: o carrinho funciona só em memória */
    }
  }, [slug, state])
  return [state, dispatch] as const
}
