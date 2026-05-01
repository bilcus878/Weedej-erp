'use client'

/**
 * ERPListFilters — filter row container for all ERP list pages.
 *
 * Provides:
 *  - Responsive flex row that wraps on mobile
 *  - "Resetovat filtry" button shown only when filters are active
 *  - Result count badge
 *  - Children are the actual filter inputs (text, select, date, etc.)
 */

import React from 'react'
import { X } from 'lucide-react'

interface ERPListFiltersProps {
  /** Filter input controls */
  children:         React.ReactNode
  /** Show and enable the reset button */
  hasActiveFilters?: boolean
  /** Called when the user clicks Reset */
  onReset?:         () => void
  /** Optional count label shown on the right side */
  resultCount?:     number
  /** Loading state — shows spinner instead of count */
  isLoading?:       boolean
}

export function ERPListFilters({
  children,
  hasActiveFilters = false,
  onReset,
  resultCount,
  isLoading = false,
}: ERPListFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">

      {/* ── Filter inputs ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-wrap gap-2 items-center">
        {children}
      </div>

      {/* ── Right side: count + reset ─────────────────────────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        {resultCount !== undefined && (
          <span className="text-sm text-gray-500 tabular-nums">
            {isLoading ? (
              <span className="inline-block w-16 h-4 bg-gray-200 rounded animate-pulse" />
            ) : (
              <>{resultCount.toLocaleString('cs-CZ')} záznamů</>
            )}
          </span>
        )}

        {hasActiveFilters && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600
                       hover:text-blue-800 transition-colors"
            aria-label="Resetovat filtry"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            Resetovat
          </button>
        )}
      </div>

    </div>
  )
}

// ── Filter primitives ─────────────────────────────────────────────────────────
// Lightweight inline-use inputs — compose with ERPListFilters

interface FilterInputProps {
  placeholder?: string
  value:        string
  onChange:     (v: string) => void
  className?:   string
  'aria-label'?: string
}

export function FilterInput({
  placeholder = 'Hledat…',
  value,
  onChange,
  className = '',
  ...rest
}: FilterInputProps) {
  return (
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`
        h-8 rounded-lg border border-gray-300 bg-white px-3 text-sm
        placeholder:text-gray-400 focus:outline-none focus:ring-2
        focus:ring-blue-500 focus:border-transparent
        min-w-[160px] max-w-[280px] w-full
        ${className}
      `}
      {...rest}
    />
  )
}

interface FilterSelectProps<T extends string> {
  value:    T | ''
  onChange: (v: T | '') => void
  options:  { value: T; label: string }[]
  placeholder?: string
  className?: string
  'aria-label'?: string
}

export function FilterSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Vše',
  className = '',
  ...rest
}: FilterSelectProps<T>) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as T | '')}
      className={`
        h-8 rounded-lg border border-gray-300 bg-white px-3 text-sm
        text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500
        focus:border-transparent min-w-[120px] max-w-[200px]
        ${className}
      `}
      {...rest}
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

interface FilterDateProps {
  value:    string
  onChange: (v: string) => void
  className?: string
  'aria-label'?: string
}

export function FilterDate({ value, onChange, className = '', ...rest }: FilterDateProps) {
  return (
    <input
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`
        h-8 rounded-lg border border-gray-300 bg-white px-3 text-sm
        text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500
        focus:border-transparent min-w-[140px]
        ${className}
      `}
      {...rest}
    />
  )
}
