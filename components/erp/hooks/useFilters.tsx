'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { FilterInput }  from '../filters/FilterInput'
import { FilterSelect } from '../filters/FilterSelect'
import type { SelectOption } from '../table/ColumnDef'

// ─── Config types ─────────────────────────────────────────────────────────────

type TextConfig<T>   = { key: string; type: 'text' | 'date'; match: (row: T, v: string) => boolean; placeholder?: string }
type NumberConfig<T> = { key: string; type: 'number'; match: (row: T, v: number) => boolean; placeholder?: string }
type SelectConfig<T> = { key: string; type: 'select'; match: (row: T, v: string) => boolean; options: SelectOption[]; placeholder?: string }

export type FilterConfig<T> = TextConfig<T> | NumberConfig<T> | SelectConfig<T>

// ─── Return type ──────────────────────────────────────────────────────────────

export interface FiltersResult<T> {
  fn:    (row: T, raw: Record<string, string>) => boolean
  values: Record<string, string>
  set:   (key: string, value: string) => void
  clear: () => void
  bar:   (columns?: string) => ReactNode
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFilters<T>(configs: FilterConfig<T>[], onChanged?: () => void): FiltersResult<T> {
  const [values, setValues] = useState<Record<string, string>>({})

  function set(key: string, value: string) {
    setValues(prev => ({ ...prev, [key]: value }))
    onChanged?.()
  }

  function clear() {
    setValues({})
    onChanged?.()
  }

  // fn ignores the raw argument from useEntityPage and uses closure values
  function fn(row: T, _raw: Record<string, string>): boolean {
    return configs.every(cfg => {
      const val = values[cfg.key]
      if (!val) return true
      if (cfg.type === 'number') {
        const num = parseFloat(val)
        return isNaN(num) ? true : (cfg as NumberConfig<T>).match(row, num)
      }
      return (cfg as TextConfig<T> | SelectConfig<T>).match(row, val)
    })
  }

  // Returns JSX directly (not a component) to avoid remount-on-render issues
  function bar(columns?: string): ReactNode {
    const style     = columns ? { gridTemplateColumns: columns } : undefined
    const className = columns
      ? 'grid items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg'
      : 'flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg'

    return (
      <div className={className} style={style}>
        <button
          onClick={clear}
          title="Vymazat filtry"
          className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs rounded transition-colors flex items-center justify-center shrink-0"
        >
          ✕
        </button>
        {configs.map(cfg => {
          if (cfg.type === 'select') {
            return (
              <FilterSelect
                key={cfg.key}
                value={values[cfg.key] ?? cfg.options[0]?.value ?? ''}
                onChange={v => set(cfg.key, v)}
                options={cfg.options}
              />
            )
          }
          return (
            <FilterInput
              key={cfg.key}
              type={cfg.type}
              value={values[cfg.key] ?? ''}
              onChange={v => set(cfg.key, v)}
              placeholder={cfg.placeholder}
            />
          )
        })}
      </div>
    )
  }

  return { fn, values, set, clear, bar }
}
