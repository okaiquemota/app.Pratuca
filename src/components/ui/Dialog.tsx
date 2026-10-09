import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** Em telas pequenas, abre como painel inferior (bottom sheet). */
  sheet?: boolean
}

/**
 * Diálogo modal sobre o elemento nativo <dialog>, que já oferece
 * foco preso, tecla Esc e camada inerte de fundo.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', sheet = true }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      document.body.style.overflow = 'hidden'
    } else if (!open && dialog.open) {
      dialog.close()
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className={cn(
        'm-0 max-h-[100dvh] w-full max-w-full bg-transparent p-0 text-ink backdrop:bg-ink/50',
        sheet ? 'mt-auto sm:m-auto' : 'm-auto px-4',
        widths[size],
      )}
    >
      <div
        className={cn(
          'animate-enter flex max-h-[92dvh] flex-col overflow-hidden bg-white shadow-soft',
          sheet ? 'rounded-t-2xl sm:rounded-2xl' : 'rounded-2xl',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-0.5 text-sm text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar" className="-mr-2 -mt-1">
            <X className="size-5" aria-hidden />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-line bg-canvas px-5 py-3 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  )
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

/** Confirmação para ações destrutivas ou irreversíveis. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Voltar',
  tone = 'danger',
  loading,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      sheet={false}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-muted">{description}</div>
    </Dialog>
  )
}
