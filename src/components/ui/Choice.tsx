import type { InputHTMLAttributes, ReactNode, Ref } from 'react'
import { useId } from 'react'
import { cn } from '@/lib/cn'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  description?: ReactNode
  type?: 'checkbox' | 'radio'
  ref?: Ref<HTMLInputElement>
}

/** Checkbox/radio com área de toque confortável. */
export function Choice({ label, description, className, type = 'checkbox', ref, ...props }: CheckboxProps) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-line bg-white px-3.5 py-3 transition-colors',
        'hover:bg-brand-50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60',
        className,
      )}
    >
      <input
        ref={ref}
        id={id}
        type={type}
        className="mt-0.5 size-5 shrink-0 accent-brand-600"
        {...props}
      />
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-ink">{label}</span>
        {description ? <span className="text-xs text-muted">{description}</span> : null}
      </span>
    </label>
  )
}

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
  className?: string
}

export function Switch({ checked, onChange, label, description, disabled, className }: SwitchProps) {
  const id = useId()
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex flex-col">
        <span id={`${id}-label`} className="text-sm font-medium text-ink">
          {label}
        </span>
        {description ? (
          <span id={`${id}-desc`} className="text-xs text-muted">
            {description}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
          checked ? 'bg-success-600' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'inline-block size-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  )
}
