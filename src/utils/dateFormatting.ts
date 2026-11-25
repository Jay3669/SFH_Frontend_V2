import type { ApplicationSettings } from '../features/settings/settings.types'

export type RegionalFormat = ApplicationSettings['regional']

export const DEFAULT_REGIONAL_FORMAT: RegionalFormat = {
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
  timeZone: 'Asia/Kolkata',
}

export function formatDateOnly(value: string, format: RegionalFormat) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value
  const [, year, month, day] = match
  if (format.dateFormat === 'MM/DD/YYYY') return `${month}/${day}/${year}`
  if (format.dateFormat === 'YYYY-MM-DD') return `${year}-${month}-${day}`
  return `${day}/${month}/${year}`
}

export function formatTimestamp(value: Date | string, format: RegionalFormat) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: format.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const year = dateParts.find((part) => part.type === 'year')?.value
  const month = dateParts.find((part) => part.type === 'month')?.value
  const day = dateParts.find((part) => part.type === 'day')?.value
  if (!year || !month || !day) return String(value)
  const time = new Intl.DateTimeFormat('en-IN', {
    timeZone: format.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: format.timeFormat === '12h',
  }).format(date)
  return `${formatDateOnly(`${year}-${month}-${day}`, format)} ${time}`
}
