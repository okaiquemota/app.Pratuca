import { WEEKDAYS } from '@/lib/labels'
import type { OpeningHour } from './types'

export function weekdayIn(timeZone: string, date = new Date()): number {
  const name = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone }).format(date)
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name)
}

export function todayHoursLabel(hours: OpeningHour[], timeZone: string): string | null {
  if (!hours.length) return null
  const today = weekdayIn(timeZone)
  const slots = hours.filter((h) => h.day === today)
  if (!slots.length) return 'Não abre hoje'
  return `Hoje: ${slots.map((s) => `${s.open} às ${s.close}`).join(', ')}`
}

export function weeklyHours(hours: OpeningHour[]): Array<{ day: string; text: string }> {
  return WEEKDAYS.map((day, index) => {
    const slots = hours.filter((h) => h.day === index)
    return { day, text: slots.length ? slots.map((s) => `${s.open} – ${s.close}`).join(', ') : 'Fechado' }
  })
}
