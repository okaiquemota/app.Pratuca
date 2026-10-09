import {
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'

const control =
  'w-full rounded-xl border border-line bg-white px-3.5 text-[0.95rem] text-ink placeholder:text-muted/70 ' +
  'transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-200 ' +
  'disabled:bg-canvas disabled:text-muted aria-[invalid=true]:border-danger-600 aria-[invalid=true]:focus:ring-danger-50'

interface FieldProps {
  label: ReactNode
  hint?: ReactNode
  error?: string
  required?: boolean
  className?: string
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string; required?: boolean }>
}

/** Agrupa label, controle, dica e erro com os atributos de acessibilidade corretos. */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-danger-600" aria-hidden> *</span> : null}
      </label>
      {isValidElement(children)
        ? cloneElement(children, {
            id,
            'aria-invalid': error ? true : undefined,
            'aria-describedby': describedBy,
            required: children.props.required ?? required,
          })
        : children}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-danger-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function Input({ className, ref, ...props }: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={cn(control, 'min-h-11', className)} {...props} />
}

export function Textarea({
  className,
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return <textarea ref={ref} className={cn(control, 'min-h-24 py-2.5', className)} {...props} />
}

export function Select({
  className,
  ref,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement> }) {
  return (
    <select ref={ref} className={cn(control, 'min-h-11 pr-8', className)} {...props}>
      {children}
    </select>
  )
}

/**
 * Campo com prefixo (ex.: "R$" ou "pratuca.app/loja/"). Repassa id e
 * atributos aria recebidos do <Field> para o input interno.
 */
export function InputGroup({
  prefix,
  children,
  ...passthrough
}: { prefix: ReactNode; children: ReactElement<Record<string, unknown>> } & Record<string, unknown>) {
  return (
    <div className="flex items-stretch">
      <span className="inline-flex max-w-[55%] items-center truncate rounded-l-xl border border-r-0 border-line bg-canvas px-3 text-sm text-muted">
        {prefix}
      </span>
      <div className="min-w-0 flex-1 [&_input]:rounded-l-none">{cloneElement(children, passthrough)}</div>
    </div>
  )
}
