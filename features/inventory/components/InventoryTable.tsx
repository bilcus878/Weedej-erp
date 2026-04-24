'use client'

import type { RefObject } from 'react'
import { ChevronDown, ChevronUp, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { formatQuantity } from '@/lib/utils'
import { FilterInput, FilterSelect } from '@/components/erp'
import type { FiltersResult, SelectOption } from '@/components/erp'
import type { InventorySummary, Category, SortField, SortDirection } from '../types'

const STATUS_OPTIONS: SelectOption[] = [
  { value: '',      label: 'Status'                                    },
  { value: 'ok',    label: 'OK',        className: 'text-green-600'  },
  { value: 'low',   label: 'Nízký',     className: 'text-orange-600' },
  { value: 'empty', label: 'Vyprodáno', className: 'text-red-600'    },
]

interface Props {
  filteredAndSorted: InventorySummary[]
  filters:           FiltersResult<InventorySummary>
  categories:        Category[]
  highlightId:       string | null | undefined
  sortField:         SortField
  sortDirection:     SortDirection
  onSort:            (field: SortField) => void
  currentPage:       number
  itemsPerPage:      number
  setItemsPerPage:   (n: number) => void
  setCurrentPage:    (n: number) => void
  onPageChange:      (n: number) => void
  onSelectProduct:   (productId: string) => void
  sectionRef:        RefObject<HTMLDivElement>
}

function SortBtn({ field, sortField, sortDirection, onSort }: {
  field: SortField; sortField: SortField; sortDirection: SortDirection; onSort: (f: SortField) => void
}) {
  const active = sortField === field
  return (
    <button
      onClick={() => onSort(field)}
      className={`shrink-0 transition-colors ${active ? 'text-purple-600' : 'text-gray-300 hover:text-gray-500'}`}
    >
      {active
        ? (sortDirection === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)
        : <ChevronsUpDown className="h-3.5 w-3.5" />
      }
    </button>
  )
}

function buildPages(totalPages: number, currentPage: number): (number | string)[] {
  const pages: (number | string)[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage <= 3)                   pages.push(2, 3, 4, '...', totalPages)
    else if (currentPage >= totalPages - 2) pages.push('...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    else                                    pages.push('...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
  }
  return pages
}

export function InventoryTable({
  filteredAndSorted, filters, categories, highlightId,
  sortField, sortDirection, onSort,
  currentPage, itemsPerPage, setItemsPerPage, setCurrentPage, onPageChange,
  onSelectProduct, sectionRef,
}: Props) {
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage)
  const pages      = buildPages(totalPages, currentPage)
  const paginated  = filteredAndSorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const v = filters.values
  const s = filters.set

  const catOptions: SelectOption[] = [
    { value: '', label: 'Kategorie' },
    ...categories.map(c => ({ value: c.id, label: c.name })),
  ]

  const header = (
    <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-3 px-4 py-3 bg-gray-100 border-b rounded-t-lg">
      <button
        onClick={filters.clear}
        title="Vymazat filtry"
        className="w-6 h-6 bg-gray-200 hover:bg-gray-300 text-gray-500 text-[10px] rounded transition-colors flex items-center justify-center shrink-0 mx-auto"
      >
        ✕
      </button>

      <div className="flex items-center gap-1.5">
        <FilterInput value={v['name'] ?? ''} onChange={val => s('name', val)} placeholder="Produkt..." className="flex-1 min-w-0" />
        <SortBtn field="productName" sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
      </div>

      <div className="flex items-center gap-1.5">
        <FilterSelect value={v['category'] ?? ''} onChange={val => s('category', val)} options={catOptions} className="flex-1 min-w-0" />
        <SortBtn field="category" sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
      </div>

      <div className="flex items-center gap-1.5">
        <FilterInput type="number" value={v['minStock'] ?? ''} onChange={val => s('minStock', val)} placeholder="≥ Sklad." className="flex-1 min-w-0" />
        <SortBtn field="physicalStock" sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
      </div>

      <div className="flex items-center gap-1.5">
        <FilterInput type="number" value={v['minReserved'] ?? ''} onChange={val => s('minReserved', val)} placeholder="≥ Rezerv." className="flex-1 min-w-0" />
        <SortBtn field="reservedStock" sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
      </div>

      <div className="flex items-center gap-1.5">
        <FilterInput type="number" value={v['minAvail'] ?? ''} onChange={val => s('minAvail', val)} placeholder="≥ Dostup." className="flex-1 min-w-0" />
        <SortBtn field="availableStock" sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
      </div>

      <div className="flex items-center gap-1.5">
        <FilterInput type="number" value={v['minExpected'] ?? ''} onChange={val => s('minExpected', val)} placeholder="≥ Očekáv." className="flex-1 min-w-0" />
        <SortBtn field="expectedQuantity" sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
      </div>

      <FilterSelect value={v['status'] ?? ''} onChange={val => s('status', val)} options={STATUS_OPTIONS} className="w-full" />
    </div>
  )

  if (filteredAndSorted.length === 0) {
    return (
      <div ref={sectionRef} className="bg-white rounded-lg shadow-sm border border-gray-200">
        {header}
        <div className="text-center py-12">
          <p className="text-gray-500">Zatím není nic naskladněno</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={sectionRef} className="bg-white rounded-lg shadow-sm border border-gray-200">
      {header}

      <div className="divide-y divide-gray-100">
        {paginated.map(item => (
          <div key={item.productId} id={`product-${item.productId}`} className={highlightId === item.productId ? 'border-2 border-purple-500 bg-purple-50' : ''}>
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 cursor-pointer hover:bg-purple-50 transition-colors" onClick={() => onSelectProduct(item.productId)}>
              <div className="w-8"><ChevronRight className="h-5 w-5 text-gray-400" /></div>
              <div className="text-left text-sm font-medium text-gray-900 truncate">{item.productName}</div>
              <div className="text-center text-sm text-gray-600 truncate">{item.category?.name || '-'}</div>
              <div className={`text-center text-sm font-semibold ${item.stockStatus === 'empty' ? 'text-red-600' : item.stockStatus === 'low' ? 'text-orange-600' : 'text-green-600'}`}>{formatQuantity(item.physicalStock, item.unit)}</div>
              <div className="text-center text-sm font-semibold text-orange-600">{item.reservedStock > 0 ? formatQuantity(item.reservedStock, item.unit) : '-'}</div>
              <div className="text-center text-sm font-semibold text-green-600">{formatQuantity(item.availableStock, item.unit)}</div>
              <div className="text-center text-sm font-semibold text-blue-600">{item.expectedQuantity > 0 ? `+${formatQuantity(item.expectedQuantity, item.unit)}` : '-'}</div>
              <div className="text-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.stockStatus === 'empty' ? 'bg-red-100 text-red-800' : item.stockStatus === 'low' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                  {item.stockStatus === 'empty' ? 'Vyprodáno' : item.stockStatus === 'low' ? 'Nízký' : 'OK'}
                </span>
              </div>
            </div>
          </div>
        ))}

        <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-100 font-bold border-t-2 border-gray-300">
          <div className="w-8"></div>
          <div className="text-left text-sm">Celkem ({filteredAndSorted.length})</div>
          <div></div><div></div><div></div><div></div><div></div><div></div>
        </div>
      </div>

      <div className="p-4 border-t flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Zobrazit:</span>
          {[10, 20, 50, 100].map(count => (
            <button key={count} onClick={() => { setItemsPerPage(count); setCurrentPage(1) }} className={`px-3 py-1.5 rounded text-sm font-medium ${itemsPerPage === count ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{count}</button>
          ))}
          <span className="text-sm text-gray-500 ml-2">({filteredAndSorted.length} celkem)</span>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 text-sm font-medium">Předchozí</button>
            {pages.map((page, index) => page === '...'
              ? <span key={`e-${index}`} className="px-2 text-gray-500">...</span>
              : <button key={page} onClick={() => onPageChange(page as number)} className={`px-3 py-1.5 rounded text-sm font-medium ${currentPage === page ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{page}</button>
            )}
            <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 text-sm font-medium">Další</button>
          </div>
        )}
      </div>
    </div>
  )
}
