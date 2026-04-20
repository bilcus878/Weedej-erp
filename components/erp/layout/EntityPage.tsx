'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ColumnDef, AccentColor } from '../table/ColumnDef'

// ─── Context ─────────────────────────────────────────────────────────────────

interface Ctx { highlightId: string | null | undefined }
const PageCtx = createContext<Ctx>({ highlightId: null })

// ─── Color map ───────────────────────────────────────────────────────────────

const colorMap: Record<AccentColor, { gradient: string; border: string; title: string; count: string }> = {
  emerald: { gradient: 'from-slate-50 to-emerald-50', border: 'border-emerald-500', title: 'text-emerald-600', count: 'text-emerald-600' },
  blue:    { gradient: 'from-slate-50 to-blue-50',    border: 'border-blue-500',    title: 'text-blue-600',    count: 'text-blue-600'    },
  purple:  { gradient: 'from-slate-50 to-purple-50',  border: 'border-purple-500',  title: 'text-purple-600',  count: 'text-purple-600'  },
  rose:    { gradient: 'from-slate-50 to-rose-50',    border: 'border-rose-500',    title: 'text-rose-600',    count: 'text-rose-600'    },
  amber:   { gradient: 'from-slate-50 to-amber-50',   border: 'border-amber-500',   title: 'text-amber-600',   count: 'text-amber-600'   },
  gray:    { gradient: 'from-slate-50 to-gray-50',    border: 'border-gray-400',    title: 'text-gray-700',    count: 'text-gray-700'    },
}

// ─── Root ────────────────────────────────────────────────────────────────────

interface RootProps {
  children:    ReactNode
  highlightId: string | null | undefined
}

function Root({ children, highlightId }: RootProps) {
  return (
    <PageCtx.Provider value={{ highlightId }}>
      <div className="space-y-4">{children}</div>
    </PageCtx.Provider>
  )
}

// ─── Header ──────────────────────────────────────────────────────────────────

interface HeaderProps {
  title:     string
  icon:      LucideIcon
  color:     AccentColor
  total:     number
  filtered:  number
  onRefresh?: () => void
  actions?:  ReactNode
}

function Header({ title, icon: Icon, color, total, filtered, onRefresh, actions }: HeaderProps) {
  const c = colorMap[color]
  return (
    <div className={`relative bg-gradient-to-r ${c.gradient} border-l-4 ${c.border} rounded-lg shadow-sm py-4 px-6`}>
      <div className="text-center">
        <h1 className={`text-2xl font-bold ${c.title} flex items-center justify-center gap-2`}>
          <Icon className="w-6 h-6" />
          {title}
          <span className="text-sm font-normal text-gray-600 ml-1">
            (Zobrazeno{' '}
            <span className={`font-semibold ${c.count}`}>{filtered}</span>
            {' '}z{' '}
            <span className="font-semibold text-gray-700">{total}</span>)
          </span>
        </h1>
      </div>
      <div className="absolute top-3 right-4 flex items-center gap-2">
        {actions}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 font-medium rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Obnovit
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Filters ─────────────────────────────────────────────────────────────────

interface FiltersProps {
  children:    ReactNode
  onClear:     () => void
  columns?:    string   // grid-cols template e.g. 'auto 1fr 1fr 2fr 1fr 1fr 1fr'
}

function Filters({ children, onClear, columns }: FiltersProps) {
  const style = columns ? { gridTemplateColumns: columns } : undefined
  const className = columns
    ? 'grid items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg'
    : 'flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg'
  return (
    <div className={className} style={style}>
      <button
        onClick={onClear}
        title="Vymazat filtry"
        className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs rounded transition-colors flex items-center justify-center shrink-0"
      >
        ✕
      </button>
      {children}
    </div>
  )
}

// ─── Table ───────────────────────────────────────────────────────────────────

interface TableProps<T> {
  columns:       ColumnDef<T>[]
  rows:          T[]
  getRowId:      (row: T) => string
  expanded:      Set<string>
  onToggle:      (id: string) => void
  renderDetail?: (row: T) => ReactNode
  rowClassName?: (row: T) => string
  empty?:        ReactNode
  emptyMessage?: string
}

function Table<T>({
  columns, rows, getRowId, expanded, onToggle,
  renderDetail, rowClassName, empty, emptyMessage,
}: TableProps<T>) {
  const { highlightId } = useContext(PageCtx)
  const gridTemplate = `auto ${columns.map(c => c.width ?? '1fr').join(' ')}`

  if (rows.length === 0) {
    return empty ?? (
      <div className="border rounded-lg p-12 text-center">
        <p className="text-gray-500">{emptyMessage ?? 'Žádné záznamy.'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Header row */}
      <div
        className="grid items-center gap-4 px-4 py-3 bg-gray-100 border rounded-lg text-xs font-semibold text-gray-700"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div className="w-8" />
        {columns.map(col => (
          <div key={col.key} className={`text-${col.align ?? 'center'} ${col.className ?? ''}`}>
            {col.header}
          </div>
        ))}
      </div>

      {/* Data rows */}
      {rows.map(row => {
        const id         = getRowId(row)
        const isExpanded = expanded.has(id)
        const isHighlit  = highlightId === id
        const extraClass = rowClassName?.(row) ?? ''

        return (
          <div
            key={id}
            id={`row-${id}`}
            className={`border rounded-lg transition-all ${
              isHighlit  ? 'ring-2 ring-blue-500 bg-blue-50' :
              isExpanded ? 'ring-2 ring-blue-400' : ''
            } ${extraClass}`}
          >
            {/* Summary row */}
            <div
              className="grid items-center gap-4 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50"
              style={{ gridTemplateColumns: gridTemplate }}
              onClick={() => onToggle(id)}
            >
              <div className="w-8 shrink-0">
                {isExpanded
                  ? <ChevronDown  className="h-5 w-5 text-gray-400" />
                  : <ChevronRight className="h-5 w-5 text-gray-400" />
                }
              </div>
              {columns.map(col => (
                <div
                  key={col.key}
                  className={`text-${col.align ?? 'center'} ${col.className ?? ''} min-w-0`}
                >
                  {col.render(row)}
                </div>
              ))}
            </div>

            {/* Expanded detail */}
            {isExpanded && renderDetail && (
              <div className="border-t p-4 bg-gray-50 space-y-4">
                {renderDetail(row)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  page:     number
  total:    number
  onChange: (p: number) => void
  size?:    number
}

function Pagination({ page, total, onChange, size = 20 }: PaginationProps) {
  if (total <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 pt-2 pb-1">
      <button
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
      >
        ←
      </button>
      <span className="text-sm text-gray-600 px-2">
        {page} / {total}
      </span>
      <button
        disabled={page === total}
        onClick={() => onChange(page + 1)}
        className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
      >
        →
      </button>
    </div>
  )
}

// ─── Compound export ──────────────────────────────────────────────────────────

export const EntityPage = Object.assign(Root, { Header, Filters, Table, Pagination })
