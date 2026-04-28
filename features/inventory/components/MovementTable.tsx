'use client'

import type { RefObject } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, Edit2 } from 'lucide-react'
import { formatDate, formatQuantity, formatPrice } from '@/lib/utils'
import { isNonVatPayer } from '@/lib/vatCalculation'
import { FilterInput, FilterSelect } from '@/components/erp'
import type { FiltersResult, SelectOption } from '@/components/erp'
import type { StockMovement, InventorySummary } from '../types'

const MOVEMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: '',    label: 'Typ'                                   },
  { value: 'in',  label: 'Příjem (+)', className: 'text-green-600' },
  { value: 'out', label: 'Výdej (-)',  className: 'text-red-600'   },
]

interface Props {
  filteredMovements:     StockMovement[]
  stockMovements:        StockMovement[]
  filters:               FiltersResult<StockMovement>
  highlightMovementId:   string | null
  expandedMovements:     Set<string>
  onToggle:              (id: string) => void
  movementsPage:         number
  movementsPerPage:      number
  setMovementsPerPage:   (n: number) => void
  onPageChange:          (n: number) => void
  movementsSectionRef:   RefObject<HTMLDivElement>
  isVatPayer:            boolean
  selectedProductId:     string | null
  summaryRows:           InventorySummary[]
  onOpenAdjustment:      () => void
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

export function MovementTable({
  filteredMovements, stockMovements, filters, highlightMovementId,
  expandedMovements, onToggle,
  movementsPage, movementsPerPage, setMovementsPerPage, onPageChange,
  movementsSectionRef,
  isVatPayer, selectedProductId, summaryRows,
  onOpenAdjustment,
}: Props) {
  const router             = useRouter()
  const totalPages         = Math.ceil(filteredMovements.length / movementsPerPage)
  const pages              = buildPages(totalPages, movementsPage)
  const paginatedMovements = filteredMovements.slice((movementsPage - 1) * movementsPerPage, movementsPage * movementsPerPage)

  const v = filters.values
  const s = filters.set

  const header = (
    <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] items-center gap-3 px-4 py-3 bg-gray-100 border-b rounded-t-lg">
      <div className="flex items-center gap-1.5">
        <button
          onClick={filters.clear}
          title="Vymazat filtry"
          className="w-5 h-5 bg-gray-200 hover:bg-gray-300 text-gray-500 text-[10px] rounded transition-colors flex items-center justify-center shrink-0"
        >
          ✕
        </button>
        <button onClick={onOpenAdjustment} className="flex items-center gap-1 px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-medium rounded border border-orange-200 transition-colors whitespace-nowrap">
          <Edit2 className="w-3 h-3 shrink-0" />Manko/Přebytek
        </button>
      </div>

      <FilterInput type="date" value={v['date'] ?? ''} onChange={val => s('date', val)} className="w-full text-center" />

      <FilterSelect value={v['type'] ?? ''} onChange={val => s('type', val)} options={MOVEMENT_TYPE_OPTIONS} className="w-full" />

      <FilterInput type="number" value={v['minQuantity'] ?? ''} onChange={val => s('minQuantity', val)} placeholder="Min. mn." className="w-full text-center" />

      <FilterInput value={v['batch'] ?? ''} onChange={val => s('batch', val)} placeholder="Šarže..." className="w-full text-center" />

      <FilterInput value={v['note'] ?? ''} onChange={val => s('note', val)} placeholder="Poznámka..." className="w-full text-center" />
    </div>
  )

  if (filteredMovements.length === 0) {
    return (
      <div ref={movementsSectionRef} className="bg-white rounded-lg shadow-sm border border-gray-200">
        {header}
        <div className="text-center py-12">
          <p className="text-gray-500">{stockMovements.length === 0 ? 'Žádné skladové pohyby' : 'Žádné pohyby odpovídající filtru'}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={movementsSectionRef} className="bg-white rounded-lg shadow-sm border border-gray-200">
      {header}

      <div className="divide-y divide-gray-100">
        {paginatedMovements.map(movement => (
          <div key={movement.id} id={`movement-${movement.id}`} className={`${highlightMovementId === movement.id ? 'border-2 border-purple-500 bg-purple-50' : expandedMovements.has(movement.id) ? 'bg-gray-50' : ''}`}>
            <div className="p-4 grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] items-center gap-4 cursor-pointer hover:bg-gray-50" onClick={() => onToggle(movement.id)}>
              <button className="w-8">
                {expandedMovements.has(movement.id) ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
              </button>
              <div className="text-center text-sm font-medium text-gray-900">{formatDate(movement.date)}</div>
              <div className="text-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${movement.type === 'stock_in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {movement.type === 'stock_in' ? 'Naskladnění' : 'Vyskladnění'}
                </span>
              </div>
              <div className="text-center text-sm font-medium" style={{ color: movement.type === 'stock_out' ? '#dc2626' : '#111827' }}>
                {formatQuantity(Math.abs(movement.quantity), movement.unit)}
              </div>
              <div className="text-center">
                {movement.batch ? (
                  <button
                    onClick={e => { e.stopPropagation(); router.push(`/batches/${movement.batch!.id}`) }}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                  >
                    {movement.batch.batchNumber}
                  </button>
                ) : (
                  <span className="text-gray-300 text-xs">—</span>
                )}
              </div>
              <div className="text-center text-sm text-gray-600 truncate">{movement.note || '-'}</div>
            </div>

            {expandedMovements.has(movement.id) && (
              <div className="border-t p-4 bg-gray-50 space-y-3">
                {movement.batch && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                    <div className="text-sm flex items-center justify-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Šarže:</span>
                        <button onClick={() => router.push(`/batches/${movement.batch!.id}`)} className="font-mono font-semibold text-amber-700 hover:underline">{movement.batch.batchNumber}</button>
                      </div>
                      {movement.batch.expiryDate && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Expirace:</span>
                          <span className="font-medium">{new Date(movement.batch.expiryDate).toLocaleDateString('cs-CZ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-sm flex items-center justify-center gap-4 flex-wrap">
                    {movement.receipt && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Příjemka:</span>
                        <button onClick={() => router.push(`/receipts?highlight=${movement.receipt!.id}`)} className="text-blue-600 hover:underline font-medium">{movement.receipt.receiptNumber}</button>
                      </div>
                    )}
                    {movement.deliveryNote && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Výdejka:</span>
                        <button onClick={() => router.push(`/delivery-notes?highlight=${movement.deliveryNote!.id}`)} className="text-blue-600 hover:underline font-medium">{movement.deliveryNote.deliveryNumber}</button>
                      </div>
                    )}
                    {movement.transaction && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Transakce:</span>
                        <button onClick={() => router.push(`/transactions?highlight=${movement.transaction!.id}`)} className="text-blue-600 hover:underline font-medium">{movement.transaction.transactionCode}</button>
                      </div>
                    )}
                    {movement.customerOrder && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Objednávka:</span>
                        <button onClick={() => router.push(`/customer-orders?highlight=${movement.customerOrder!.id}`)} className="text-blue-600 hover:underline font-medium">{movement.customerOrder.orderNumber}</button>
                      </div>
                    )}
                    {movement.purchaseOrder && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Objednávka:</span>
                        <button onClick={() => router.push(`/purchase-orders?highlight=${movement.purchaseOrder!.id}`)} className="text-blue-600 hover:underline font-medium">{movement.purchaseOrder.orderNumber}</button>
                      </div>
                    )}
                    {movement.receivedInvoice && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Faktura přijatá:</span>
                        <button onClick={() => router.push(`/invoices/received?highlight=${movement.receivedInvoice!.id}`)} className="text-blue-600 hover:underline font-medium">{movement.receivedInvoice.invoiceNumber}</button>
                      </div>
                    )}
                    {movement.issuedInvoice && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Faktura vydaná:</span>
                        <button onClick={() => router.push(`/invoices/issued?highlight=${movement.issuedInvoice!.id}`)} className="text-blue-600 hover:underline font-medium">{movement.issuedInvoice.invoiceNumber}</button>
                      </div>
                    )}
                  </div>
                </div>
                {movement.type === 'stock_in' && (movement.supplier || movement.purchasePrice) && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <div className="text-sm flex items-center justify-center gap-6 flex-wrap">
                      {movement.supplier && (
                        <div><span className="text-gray-600">Dodavatel:</span> <span className="ml-2 font-medium">{movement.supplier.name}</span></div>
                      )}
                      {movement.purchasePrice && (() => {
                        const productVatRate = summaryRows.find(s => s.productId === selectedProductId)?.vatRate ?? 21
                        const itemIsNonVat   = isNonVatPayer(productVatRate)
                        const vatPerUnit     = (isVatPayer && !itemIsNonVat) ? movement.purchasePrice * productVatRate / 100 : 0
                        return (
                          <div>
                            {isVatPayer && !itemIsNonVat ? (
                              <>
                                <span className="text-gray-500">Nákup bez DPH:</span> <span className="font-medium">{formatPrice(movement.purchasePrice)}</span>
                                <span className="mx-2 text-gray-400">|</span>
                                <span className="text-gray-600">s DPH ({productVatRate}%):</span> <span className="ml-1 font-bold text-gray-900">{formatPrice(movement.purchasePrice + vatPerUnit)}</span>
                              </>
                            ) : (
                              <><span className="text-gray-600">Nákupní cena:</span> <span className="ml-2 font-medium">{formatPrice(movement.purchasePrice)}</span></>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Zobrazit:</span>
          {[10, 20, 50, 100].map(count => (
            <button key={count} onClick={() => setMovementsPerPage(count)} className={`px-3 py-1.5 rounded text-sm font-medium ${movementsPerPage === count ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{count}</button>
          ))}
          <span className="text-sm text-gray-500 ml-2">({filteredMovements.length} celkem)</span>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button onClick={() => onPageChange(Math.max(1, movementsPage - 1))} disabled={movementsPage === 1} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 text-sm font-medium">Předchozí</button>
            {pages.map((page, index) => page === '...'
              ? <span key={`e-${index}`} className="px-2 text-gray-500">...</span>
              : <button key={page} onClick={() => onPageChange(page as number)} className={`px-3 py-1.5 rounded text-sm font-medium ${movementsPage === page ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{page}</button>
            )}
            <button onClick={() => onPageChange(Math.min(totalPages, movementsPage + 1))} disabled={movementsPage >= totalPages} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 text-sm font-medium">Další</button>
          </div>
        )}
      </div>
    </div>
  )
}
