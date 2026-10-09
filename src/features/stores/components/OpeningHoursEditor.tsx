import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { WEEKDAYS } from '@/lib/labels'
import type { OpeningHour } from '@/features/public-menu/types'

interface DayDraft {
  enabled: boolean
  open: string
  close: string
}

function toDraft(hours: OpeningHour[]): DayDraft[] {
  return WEEKDAYS.map((_, day) => {
    const h = hours.find((x) => x.day === day)
    return h ? { enabled: true, open: h.open, close: h.close } : { enabled: false, open: '10:30', close: '14:30' }
  })
}

/**
 * Horários de funcionamento (um turno por dia nesta versão; o banco já
 * aceita vários). São informativos para o cliente; quem abre/fecha a
 * loja para pedidos é o botão "Loja aberta".
 */
export function OpeningHoursEditor({ value, onSave, saving }: { value: OpeningHour[]; onSave: (hours: OpeningHour[]) => Promise<void>; saving: boolean }) {
  const [days, setDays] = useState<DayDraft[]>(() => toDraft(value))
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    const invalid = days.findIndex((d) => d.enabled && (!d.open || !d.close || d.open === d.close))
    if (invalid >= 0) {
      setError(`Revise o horário de ${WEEKDAYS[invalid]}.`)
      return
    }
    setError(null)
    await onSave(days.flatMap((d, day) => (d.enabled ? [{ day, open: d.open, close: d.close }] : [])))
  }

  const update = (index: number, patch: Partial<DayDraft>) => setDays((list) => list.map((d, i) => (i === index ? { ...d, ...patch } : d)))

  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <ul className="divide-y divide-line rounded-xl border border-line">
        {days.map((d, index) => (
          <li key={WEEKDAYS[index]} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <label className="flex min-h-11 w-32 items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="size-4 accent-brand-600" checked={d.enabled} onChange={(e) => update(index, { enabled: e.target.checked })} />
              {WEEKDAYS[index]}
            </label>
            {d.enabled ? (
              <div className="flex items-center gap-2 text-sm">
                <label className="sr-only" htmlFor={`abre-${index}`}>Abre às ({WEEKDAYS[index]})</label>
                <input id={`abre-${index}`} type="time" value={d.open} onChange={(e) => update(index, { open: e.target.value })} className="min-h-10 rounded-lg border border-line px-2" />
                <span className="text-muted">às</span>
                <label className="sr-only" htmlFor={`fecha-${index}`}>Fecha às ({WEEKDAYS[index]})</label>
                <input id={`fecha-${index}`} type="time" value={d.close} onChange={(e) => update(index, { close: e.target.value })} className="min-h-10 rounded-lg border border-line px-2" />
              </div>
            ) : (
              <span className="text-sm text-muted">Fechado</span>
            )}
          </li>
        ))}
      </ul>
      <Button className="self-end" loading={saving} onClick={() => void submit()}>
        Salvar horários
      </Button>
    </div>
  )
}
