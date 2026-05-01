// Pure math helpers for analytics metrics — no DB access, no side effects.

export function safeDiv(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator
}

export function pctOf(part: number, total: number): number {
  return safeDiv(part, total) * 100
}

export function grossMargin(revenue: number, cogs: number): number {
  return safeDiv(revenue - cogs, revenue) * 100
}

export function avgOrderValue(revenue: number, orderCount: number): number {
  return safeDiv(revenue, orderCount)
}

export function conversionRate(conversions: number, sessions: number): number {
  return safeDiv(conversions, sessions) * 100
}

export function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : Infinity
  return ((current - previous) / previous) * 100
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

export function sumBy<T>(arr: T[], fn: (item: T) => number): number {
  return arr.reduce((acc, item) => acc + fn(item), 0)
}

export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item)
    ;(acc[k] ??= []).push(item)
    return acc
  }, {})
}
