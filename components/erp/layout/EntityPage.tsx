'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ColumnDef, AccentColor } from '../table/ColumnDef'
import { useNavbarMeta } from '@/components/NavbarMetaContext'

// ─── Context ─────────────────────────────────────────────────────────────────

interface Ctx { highlightId: string | null | undefined }
const PageCtx = createContext<Ctx>({ highlightId: null })

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
  title?:     string
  icon?:      LucideIcon
  color:      AccentColor
  total:      number
  filtered:   number
  onRefresh?: () => void
  actions?:   ReactNode
}

function Header({ total, filtered, actions }: HeaderProps) {
  const { setMeta } = useNavbarMeta()

  useEffect(() => {
    // actions intentionally excluded from deps — JSX identity changes every render;
    // actions are effectively static per page mount so omitting is safe here.
    setMeta({ count: `Zobrazeno ${filtered} z ${total}`, actions: actions ?? undefined })
    return () => setMeta({ count: '', actions: undefined })
  }, [filtered, total, setMeta]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
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
  columns:         ColumnDef<T>[]
  rows:            T[]
  getRowId:        (row: T) => string
  expanded:        Set<string>
  onToggle:        (id: string) => void
  renderDetail?:   (row: T) => ReactNode
  rowClassName?:   (row: T) => string
  empty?:          ReactNode
  emptyMessage?:   string
  firstHeader?:    ReactNode
  onClearFilters?: () => void
}

function Table<T>({
  columns, rows, getRowId, expanded, onToggle,
  renderDetail, rowClassName, empty, emptyMessage, firstHeader, onClearFilters,
}: TableProps<T>) {
  const { highlightId } = useContext(PageCtx)
  const gridTemplate = `auto ${columns.map(c => c.width ?? '1fr').join(' ')}`
  const hasFilters   = columns.some(c => c.filterNode)

  const header = (
    <div
      className={`grid gap-4 px-4 py-3 bg-gray-100 border rounded-lg text-xs font-semibold text-gray-700 ${hasFilters ? 'items-start' : 'items-center'}`}
      style={{ gridTemplateColumns: gridTemplate }}
    >
      <div className={`w-8 flex items-center justify-center ${hasFilters ? 'pt-1.5' : ''}`}>
        {hasFilters && onClearFilters
          ? (
            <button
              onClick={onClearFilters}
              title="Vymazat filtry"
              className="w-6 h-6 bg-gray-200 hover:bg-gray-300 text-gray-500 text-[10px] rounded transition-colors flex items-center justify-center shrink-0"
            >
              ✕
            </button>
          )
          : firstHeader ?? null
        }
      </div>
      {columns.map(col => (
        <div key={col.key} className={`${col.className ?? ''}`}>
          <div className={`text-xs font-semibold text-gray-700 ${hasFilters ? 'mb-1.5' : ''} text-${col.align ?? 'center'}`}>
            {col.header}
          </div>
          {col.filterNode}
        </div>
      ))}
    </div>
  )

  if (rows.length === 0) {
    return (
      <div className="space-y-1">
        {header}
        {empty ?? (
          <div className="border rounded-lg p-12 text-center">
            <p className="text-gray-500">{emptyMessage ?? 'Žádné záznamy.'}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Header row */}
      {header}

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
