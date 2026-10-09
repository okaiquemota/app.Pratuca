import { useCallback, useState } from 'react'

/** Copia texto para a área de transferência com fallback. */
export function useCopy(timeout = 2000) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        const area = document.createElement('textarea')
        area.value = text
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        document.execCommand('copy')
        area.remove()
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), timeout)
    },
    [timeout],
  )
  return { copied, copy }
}
