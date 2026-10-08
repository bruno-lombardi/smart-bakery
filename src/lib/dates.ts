const pad = (n: number) => String(n).padStart(2, '0')

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayISO = () => toISODate(new Date())

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export const monthKey = (iso: string) => iso.slice(0, 7)
export const currentMonthKey = () => monthKey(todayISO())

export function addMonths(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return monthFmt.format(new Date(y, m - 1, 1))
}

const shortMonthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
export function shortMonthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return shortMonthFmt.format(new Date(y, m - 1, 1)).replace('.', '')
}

const dayFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
export function formatDay(iso: string): string {
  const today = todayISO()
  if (iso === today) return 'Hoje'
  if (iso === addDays(today, 1)) return 'Amanhã'
  if (iso === addDays(today, -1)) return 'Ontem'
  return dayFmt.format(parseISODate(iso)).replace('.', '')
}

const longDayFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
export const formatLongDay = (iso: string) => longDayFmt.format(parseISODate(iso))

export const formatShortDate = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export function greeting(hour = new Date().getHours()): string {
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}
