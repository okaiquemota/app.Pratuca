import { ImagePlus, Trash2 } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ALLOWED_IMAGE_TYPES, validateImageFile } from '@/lib/images'
import { publicImageUrl } from '@/lib/supabase'

interface Props {
  currentPath: string | null
  file: File | null
  removed: boolean
  onSelect: (file: File | null) => void
  onRemove: () => void
  label?: string
}

/** Seleção de foto com prévia. O envio acontece ao salvar o formulário. */
export function ImagePicker({ currentPath, file, removed, onSelect, onRemove, label = 'Foto' }: Props) {
  const id = useId()
  const [error, setError] = useState<string | null>(null)
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  const shown = preview ?? (!removed ? publicImageUrl(currentPath) : null)

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-4">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-canvas">
          {shown ? <img src={shown} alt="" className="size-full object-cover" /> : <ImagePlus className="size-7 text-muted" aria-hidden />}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={id} className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-xl border border-line bg-white px-3 text-sm font-semibold hover:bg-brand-50 focus-within:ring-3 focus-within:ring-brand-200">
            {shown ? 'Trocar foto' : 'Escolher foto'}
            <input
              id={id}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(',')}
              className="sr-only"
              onChange={(e) => {
                const selected = e.target.files?.[0] ?? null
                e.target.value = ''
                if (!selected) return
                try {
                  validateImageFile(selected)
                  setError(null)
                  onSelect(selected)
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Imagem inválida.')
                }
              }}
            />
          </label>
          {shown ? (
            <Button variant="ghost" size="sm" icon={<Trash2 className="size-4" aria-hidden />} onClick={() => { onSelect(null); onRemove() }}>
              Remover
            </Button>
          ) : null}
          <p className="text-xs text-muted">JPG, PNG ou WebP. Reduzimos automaticamente para até 2 MB.</p>
        </div>
      </div>
      {error ? <p role="alert" className="text-xs font-medium text-danger-600">{error}</p> : null}
    </div>
  )
}
