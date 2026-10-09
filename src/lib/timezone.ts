export const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

function parts(date: Date, timeZone: string): Record<string, number> {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const out: Record<string, number> = {}
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value)
  }
  return out
}

/** Data local (YYYY-MM-DD) no fuso informado. */
export function localDateString(date: Date = new Date(), timeZone = DEFAULT_TIMEZONE): string {
  const p = parts(date, timeZone)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/** Diferença (ms) entre o horário local do fuso e UTC em um instante. */
function offsetMs(date: Date, timeZone: string): number {
  const p = parts(date, timeZone)
  const asUtc = Date.UTC(p.year!, p.month! - 1, p.day!, p.hour! % 24, p.minute!, p.second!)
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

/** Instante UTC correspondente à meia-noite de `day` (YYYY-MM-DD) no fuso. */
export function zonedMidnight(day: string, timeZone = DEFAULT_TIMEZONE): Date {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  const guess = new Date(Date.UTC(y, m - 1, d))
  const first = new Date(guess.getTime() - offsetMs(guess, timeZone))
  // segunda passada corrige mudanças de horário de verão
  return new Date(guess.getTime() - offsetMs(first, timeZone))
}

/** Intervalo [início, fim) de um dia local, em ISO UTC. */
export function zonedDayRange(day: string, timeZone = DEFAULT_TIMEZONE): { from: string; to: string } {
  const start = zonedMidnight(day, timeZone)
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  const next = new Date(Date.UTC(y, m - 1, d + 1))
  const nextDay = next.toISOString().slice(0, 10)
  return { from: start.toISOString(), to: zonedMidnight(nextDay, timeZone).toISOString() }
}

export function addDays(day: string, amount: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d + amount)).toISOString().slice(0, 10)
}
