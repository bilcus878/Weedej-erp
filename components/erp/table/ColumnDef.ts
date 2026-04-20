import type { ReactNode } from 'react'

export interface ColumnDef<T> {
  key:       string
  header:    string
  width?:    string                    // '1fr' | '2fr' | 'auto' | '120px'
  align?:    'left' | 'center' | 'right'
  className?: string
  render:    (row: T) => ReactNode
}

export type AccentColor = 'emerald' | 'blue' | 'purple' | 'rose' | 'amber' | 'gray'

export interface SelectOption {
  value:     string
  label:     string
  className?: string
}
