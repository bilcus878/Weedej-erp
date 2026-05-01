import {
  startOfDay, endOfDay,
  startOfMonth, endOfMonth,
  startOfYear, endOfYear,
  subDays, subMonths, subYears,
  format,
} from 'date-fns'

export type DatePreset =
  | 'today' | 'yesterday' | 'last7' | 'last30'
  | 'thisMonth' | 'lastMonth' | 'last90' | 'last12months'
  | 'thisYear' | 'lastYear' | 'custom'

export interface DateRange { from: Date; to: Date }

export interface DateRangeWithLabel extends DateRange {
  label:  string
  preset: DatePreset
}

export function buildPreset(preset: DatePreset, customFrom?: Date, customTo?: Date): DateRangeWithLabel {
  const now = new Date()
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now), label: 'Dnes', preset }
    case 'yesterday': {
      const y = subDays(now, 1)
      return { from: startOfDay(y), to: endOfDay(y), label: 'Včera', preset }
    }
    case 'last7':
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now), label: 'Posledních 7 dní', preset }
    case 'last30':
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now), label: 'Posledních 30 dní', preset }
    case 'thisMonth':
      return { from: startOfMonth(now), to: endOfDay(now), label: 'Tento měsíc', preset }
    case 'lastMonth': {
      const lm = subMonths(now, 1)
      return { from: startOfMonth(lm), to: endOfMonth(lm), label: 'Minulý měsíc', preset }
    }
    case 'last90':
      return { from: startOfDay(subDays(now, 89)), to: endOfDay(now), label: 'Posledních 90 dní', preset }
    case 'last12months':
      return { from: subMonths(startOfDay(now), 12), to: endOfDay(now), label: 'Posledních 12 měsíců', preset }
    case 'thisYear':
      return { from: startOfYear(now), to: endOfDay(now), label: 'Tento rok', preset }
    case 'lastYear': {
      const ly = subYears(now, 1)
      return { from: startOfYear(ly), to: endOfYear(ly), label: 'Minulý rok', preset }
    }
    case 'custom':
      return {
        from:   customFrom ?? startOfDay(subDays(now, 29)),
        to:     customTo   ?? endOfDay(now),
        label:  'Vlastní rozsah',
        preset: 'custom',
      }
  }
}

export function getPreviousPeriod(range: DateRange): DateRange {
  const ms = range.to.getTime() - range.from.getTime()
  return { from: new Date(range.from.getTime() - ms - 1), to: new Date(range.from.getTime() - 1) }
}

export function getYearAgoPeriod(range: DateRange): DateRange {
  return { from: subYears(range.from, 1), to: subYears(range.to, 1) }
}

export function formatRangeLabel(range: DateRange): string {
  return `${format(range.from, 'd. M. yyyy')} – ${format(range.to, 'd. M. yyyy')}`
}

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today',        label: 'Dnes' },
  { value: 'yesterday',    label: 'Včera' },
  { value: 'last7',        label: '7 dní' },
  { value: 'last30',       label: '30 dní' },
  { value: 'thisMonth',    label: 'Tento měsíc' },
  { value: 'lastMonth',    label: 'Minulý měsíc' },
  { value: 'last90',       label: '90 dní' },
  { value: 'last12months', label: '12 měsíců' },
  { value: 'thisYear',     label: 'Tento rok' },
  { value: 'lastYear',     label: 'Minulý rok' },
  { value: 'custom',       label: 'Vlastní' },
]
