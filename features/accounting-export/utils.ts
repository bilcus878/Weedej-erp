import type { ExportFormat } from './types'
import { FORMATS } from './constants'

export function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('cs-CZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatLabel(format: ExportFormat): string {
  return FORMATS.find(f => f.id === format)?.label ?? format
}

export function getPresets(): { label: string; from: string; to: string }[] {
  const now = new Date()
  const y   = now.getFullYear()
  const m   = now.getMonth()

  const iso   = (d: Date) => d.toISOString().slice(0, 10)
  const first = (year: number, month: number) => new Date(year, month, 1)
  const last  = (year: number, month: number) => new Date(year, month + 1, 0)

  return [
    { label: 'Tento měsíc',       from: iso(first(y, m)),     to: iso(now) },
    { label: 'Minulý měsíc',      from: iso(first(y, m - 1)), to: iso(last(y, m - 1)) },
    { label: `Q1 ${y}`,           from: `${y}-01-01`,          to: `${y}-03-31` },
    { label: `Q2 ${y}`,           from: `${y}-04-01`,          to: `${y}-06-30` },
    { label: `Q3 ${y}`,           from: `${y}-07-01`,          to: `${y}-09-30` },
    { label: `Q4 ${y}`,           from: `${y}-10-01`,          to: `${y}-12-31` },
    { label: `Celý rok ${y}`,     from: `${y}-01-01`,          to: `${y}-12-31` },
    { label: `Celý rok ${y - 1}`, from: `${y - 1}-01-01`,      to: `${y - 1}-12-31` },
  ]
}
