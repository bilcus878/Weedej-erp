'use client'

import Link    from 'next/link'
import { Package } from 'lucide-react'
import { formatPrice }      from '@/lib/shared/finance/money'
import { formatVariantQty } from '@/lib/shared/inventory/formatVariantQty'
import type { OrderDetailData } from '@/components/erp'

interface Props {
  order:      OrderDetailData
  isVatPayer: boolean
}

export function OrderItemsSection({ order, isVatPayer }: Props) {
  // Build inventory-movement lookup from delivery notes
  const inventoryLookup: Record<string, string> = {}
  for (const dn of order.deliveryNotes ?? []) {
    for (const item of dn.items) {
      if (item.productId && item.inventoryItemId) {
        inventoryLookup[item.productId] = item.inventoryItemId
      }
    }
  }

  const catalogItems = order.items.filter(i => i.productId !== null)
  const nullItems    = order.items.filter(i => i.productId === null)
  const shippingItem = nullItems.find(i => /(doprav|shipping)/i.test(i.productName ?? ''))
  const discountItem = nullItems.find(i => !/(doprav|shipping)/i.test(i.productName ?? ''))

  const catalogSubtotal = catalogItems.reduce((sum, item) => {
    const pwv = Number(item.priceWithVat)
    const raw = pwv * Number(item.quantity)
    return sum + (raw > Number(order.totalAmount) * 1.05 ? pwv : raw)
  }, 0)
  const shippingTotal  = shippingItem ? Number(shippingItem.priceWithVat ?? shippingItem.price ?? 0) * Number(shippingItem.quantity ?? 1) : 0
  const discountTotal  = discountItem ? Number(discountItem.priceWithVat ?? discountItem.price ?? 0) * Number(discountItem.quantity ?? 1) : 0
  const hasSubtotals   = shippingTotal !== 0 || discountTotal !== 0

  const colGrid   = isVatPayer ? 'grid-cols-[3fr_0.7fr_repeat(6,1fr)]' : 'grid-cols-[2fr_0.7fr_1fr_1fr_1fr]'
  const labelSpan = isVatPayer ? 'col-span-7' : 'col-span-4'

  const sortedItems = [...catalogItems].sort((a, b) => {
    const aShip = /(doprav|shipping)/i.test(a.productName ?? '') ? 1 : 0
    const bShip = /(doprav|shipping)/i.test(b.productName ?? '') ? 1 : 0
    return aShip - bShip
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
        <Package className="w-4 h-4 text-gray-400 shrink-0" />
        <h2 className="text-sm font-semibold text-gray-800">
          Položky ({catalogItems.length})
        </h2>
      </div>

      {catalogItems.length === 0 ? (
        <p className="px-5 py-4 text-sm text-red-600">Objednávka nemá žádné položky!</p>
      ) : (
        <div className="text-sm overflow-x-auto">
          {/* Column headers */}
          {isVatPayer ? (
            <div className="grid grid-cols-[3fr_0.7fr_repeat(6,1fr)] gap-2 px-5 py-2 bg-gray-50 font-semibold text-gray-600 border-b text-xs min-w-[640px]">
              <div>Produkt</div>
              <div className="text-center">Pohyb</div>
              <div className="text-center">Množství</div>
              <div className="text-center">DPH</div>
              <div className="text-center">Cena/ks</div>
              <div className="text-center">DPH/ks</div>
              <div className="text-center">S DPH/ks</div>
              <div className="text-center">Celkem</div>
            </div>
          ) : (
            <div className="grid grid-cols-[2fr_0.7fr_1fr_1fr_1fr] gap-3 px-5 py-2 bg-gray-50 font-semibold text-gray-600 border-b text-xs">
              <div>Produkt</div>
              <div className="text-center">Pohyb</div>
              <div className="text-right">Množství</div>
              <div className="text-right">Cena/ks</div>
              <div className="text-right">Celkem</div>
            </div>
          )}

          {/* Rows */}
          {sortedItems.map((item, i) => {
            const qty          = Number(item.quantity)
            const qtyDisplay   = formatVariantQty(qty, item.productName, item.unit)
            const unitPrice    = Number(item.price)
            const vatRate      = Number(item.vatRate)
            const vatPerUnit   = Number(item.vatAmount)
            const priceWithVat = Number(item.priceWithVat)
            const rawRowTotal  = priceWithVat * qty
            const rowTotal     = rawRowTotal > Number(order.totalAmount) * 1.05 ? priceWithVat : rawRowTotal

            const invMovId = item.productId ? (inventoryLookup[item.productId] ?? null) : null
            const invLink  = invMovId
              ? (
                <Link
                  href={`/inventory?selectedProduct=${item.productId}&highlightMovement=${invMovId}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded border border-green-200 transition-colors"
                >
                  Zobrazit
                </Link>
              )
              : <span className="text-xs text-gray-400 italic">Čeká</span>

            return isVatPayer ? (
              <div
                key={item.id}
                className={`grid grid-cols-[3fr_0.7fr_repeat(6,1fr)] gap-2 px-5 py-2 text-xs min-w-[640px] ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                <div className="font-medium text-gray-900 truncate">{item.product?.name || item.productName}</div>
                <div className="text-center">{invLink}</div>
                <div className="text-center text-gray-600">{qtyDisplay}</div>
                <div className="text-center text-gray-500">{vatRate}%</div>
                <div className="text-center text-gray-600">{formatPrice(unitPrice)}</div>
                <div className="text-center text-gray-500">{formatPrice(vatPerUnit)}</div>
                <div className="text-center text-gray-700">{formatPrice(priceWithVat)}</div>
                <div className="text-center font-semibold text-gray-900">{formatPrice(rowTotal)}</div>
              </div>
            ) : (
              <div
                key={item.id}
                className={`grid grid-cols-[2fr_0.7fr_1fr_1fr_1fr] gap-3 px-5 py-2 text-xs ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                <div className="font-medium text-gray-900 truncate">{item.product?.name || item.productName}</div>
                <div className="text-center">{invLink}</div>
                <div className="text-right text-gray-600">{qtyDisplay}</div>
                <div className="text-right text-gray-600">{formatPrice(priceWithVat)}</div>
                <div className="text-right font-semibold text-gray-900">{formatPrice(rowTotal)}</div>
              </div>
            )
          })}

          {/* Subtotals */}
          {hasSubtotals && (
            <>
              <div className={`grid ${colGrid} gap-2 px-5 py-2 bg-gray-50 border-t text-xs`}>
                <div className={`${labelSpan} text-gray-600`}>Mezisoučet</div>
                <div className={`${isVatPayer ? 'text-center' : 'text-right'} font-medium text-gray-800`}>{formatPrice(catalogSubtotal)}</div>
              </div>
              {shippingTotal !== 0 && (
                <div className={`grid ${colGrid} gap-2 px-5 py-2 bg-blue-50 border-t text-xs`}>
                  <div className={`${labelSpan} font-medium text-gray-900`}>{shippingItem?.productName || 'Doprava'}</div>
                  <div className={`${isVatPayer ? 'text-center' : 'text-right'} text-blue-700 font-medium`}>{formatPrice(shippingTotal)}</div>
                </div>
              )}
              {discountTotal !== 0 && (
                <div className={`grid ${colGrid} gap-2 px-5 py-2 bg-yellow-50 border-t text-xs`}>
                  <div className={`${labelSpan} font-medium text-gray-900`}>{discountItem?.productName || 'Sleva'}</div>
                  <div className={`${isVatPayer ? 'text-center' : 'text-right'} text-red-600 font-medium`}>{formatPrice(discountTotal)}</div>
                </div>
              )}
            </>
          )}

          {/* Grand total */}
          <div className={`grid ${colGrid} gap-2 px-5 py-3 bg-gray-100 font-bold border-t text-sm`}>
            <div className={labelSpan}>{isVatPayer ? 'Celkem s DPH' : 'Celkem'}</div>
            <div className={isVatPayer ? 'text-center' : 'text-right'}>{formatPrice(Number(order.totalAmount))}</div>
          </div>
        </div>
      )}
    </div>
  )
}
