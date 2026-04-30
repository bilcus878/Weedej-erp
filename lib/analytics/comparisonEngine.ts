import type { DateRange } from './dateRange'

export interface ComparisonValue {
  current:  number
  previous: number
  delta:    number      // absolute difference
  pctChange: number     // percentage change (can be Infinity if previous === 0)
  direction: 'up' | 'down' | 'flat'
}

export interface TimeSeriesPoint { date: string; value: number }

export interface ComparedTimeSeries {
  current:  TimeSeriesPoint[]
  previous: TimeSeriesPoint[]
}

export function compare(current: number, previous: number): ComparisonValue {
  const delta = current - previous
  const pctChange = previous === 0
    ? (current === 0 ? 0 : Infinity)
    : (delta / previous) * 100
  const direction =
    Math.abs(pctChange) < 0.5 ? 'flat' :
    delta > 0                 ? 'up'   : 'down'
  return { current, previous, delta, pctChange, direction }
}

export function compareTimeSeries(
  current:  TimeSeriesPoint[],
  previous: TimeSeriesPoint[],
): ComparedTimeSeries {
  return { current, previous }
}

export function formatPctChange(pct: number, decimals = 1): string {
  if (!isFinite(pct)) return '—'
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(decimals)} %`
}

export function shiftDateLabels(
  points:    TimeSeriesPoint[],
  currentRange: DateRange,
  previousRange: DateRange,
): TimeSeriesPoint[] {
  if (!points.length) return points
  const offsetMs = currentRange.from.getTime() - previousRange.from.getTime()
  return points.map(p => ({
    date:  new Date(new Date(p.date).getTime() + offsetMs).toISOString().slice(0, 10),
    value: p.value,
  }))
}
