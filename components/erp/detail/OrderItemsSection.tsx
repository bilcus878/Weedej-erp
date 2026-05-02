'use client'

import Link from 'next/link'
import { Package } from 'lucide-react'
import { formatPrice } from '@/lib/shared/finance/money'
import { formatVariantQty } from '@/lib/shared/inventory/formatVariantQty'
import { ERPSectionCard } from './ERPSectionCard'
import type { OrderDetailData } from './OrderDetailTypes'

// ── Component ─────────────────────────────────────────────────────────────────

export interface OrderItemsSectionProps {
  order:      OrderDetailData
  isVatPayer: boolean
  title?:     string
}

export function OrderItemsSection({ order, isVatPayer, title = 'Položky' }: OrderItemsSectionProps) {
  // Build productId → inventoryItemId lookup from delivery notes
  const inventoryLookup: Record<string, string> = {}
  for (const dn of order.deliveryNotes ?? []) {
    for (const dni of dn.items) {
      if (dni.productId && dni.inventoryItemId) {
        inventoryLookup[dni.productId] = dni.inventoryItemId
      }
    }
  }

  const catalogItems = order.items
    .filter(item => item.productId !== null)
    .sort((a, b) => {
      const aShip = /(doprav|shipping)/i.test(a.productName || '') ? 1 : 0
      const bShip = /(doprav|shipping)/i.test(b.productName || '') ? 1 : 0
      return aShip - bShip
    })

  const nullItems    = order.items.filter(item => item.productId === null)
  const shippingItem = nullItems.find(item => /(doprav|shipping)/i.test(item.productName || ''))
  const discountItem = nullItems.find(item => !/(doprav|shipping)/i.test(item.productName || ''))

  const catalogSubtotal = catalogItems.reduce((sum, item) => {
    const pwv = Number(item.priceWithVat)
    const raw = pwv * Number(item.quantity)
    return sum + (raw > Number(order.totalAmount) * 1.05 ? pwv : raw)
  }, 0)

  const shippingTotal = shippingItem
    ? Number(shippingItem.priceWithVat ?? shippingItem.price ?? 0) * Number(shippingItem.quantity ?? 1)
    : 0
  const discountTotal = discountItem
    ? Number(discountItem.priceWithVat ?? discountItem.price ?? 0) * Number(discountItem.quantity ?? 1)
    : 0

  const headerTitle = `${title} (${catalogItems.length})`

  if (order.items.length === 0) {
    return (
      <ERPSectionCard title={headerTitle} icon={<Package />}>
        <p className="text-sm text-red-600">Objednávka nemá žádné položky!</p>
      </ERPSectionCard>
    )
  }

  return (
    <ERPSectionCard title={headerTitle} icon={<Package />} className="overflow-hidden">
      {/* Override inner padding — table needs full width */}
      <div className="-mx-5 -my-4 overflow-x-auto">
        <div className="min-w-[640px]">
        {/* Header row */}
        {isVatPayer ? (
          <div className="grid grid-cols-[3fr_0.7fr_repeat(6,1fr)] gap-2 px-5 py-2.5 bg-gray-50 font-semibold text-gray-600 border-b border-gray-100 text-xs">
            <div>Produkt</div>
            <div className="text-center">Pohyb</div>
            <div className="text-center">Mn.</div>
            <div className="text-center">DPH</div>
            <div className="text-center">Cena/ks</div>
            <div className="text-center">DPH/ks</div>
            <div className="text-center">S DPH/ks</div>
            <div className="text-center">Celkem</div>
          </div>
        ) : (
          <div className="grid grid-cols-[2fr_0.7fr_1fr_1fr_1fr] gap-3 px-5 py-2.5 bg-gray-50 font-semibold text-gray-600 border-b border-gray-100 text-xs">
            <div>Produkt</div>
            <div className="text-center">Pohyb</div>
            <div className="text-right">Množství</div>
            <div className="text-right">Cena/ks</div>
            <div className="text-right">Celkem</div>
          </div>
        )}

        {/* Item rows */}
        {catalogItems.map((item, i) => {
          const qty          = Number(item.quantity)
          const qtyDisplay   = formatVariantQty(qty, item.productName, item.unit)
          const unitPrice    = Number(item.price)
          const vatRate      = Number(item.vatRate)
          const vatPerUnit   = Number(item.vatAmount)
          const priceWithVat = Number(item.priceWithVat)
          const rawRowTotal  = priceWithVat * qty
          const rowTotal     = rawRowTotal > Number(order.totalAmount) * 1.05 ? priceWithVat : rawRowTotal

          const invMovId = item.productId ? (inventoryLookup[item.productId] ?? null) : null
          const invLink = item.productId == null
            ? <span className="text-gray-300 text-xs">—</span>
            : invMovId
              ? (
                <Link
                  href={`/inventory?selectedProduct=${item.productId}&highlightMovement=${invMovId}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded border border-green-200 transition-colors"
                >
                  Zobrazit
                </Link>
              )
              : <span className="text-xs text-gray-400 italic">Čeká</span>

          const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'

          return isVatPayer ? (
            <div key={item.id} className={`grid grid-cols-[3fr_0.7fr_repeat(6,1fr)] gap-2 px-5 py-2 ${rowBg} text-xs border-b border-gray-50`}>
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
            <div key={item.id} className={`grid grid-cols-[2fr_0.7fr_1fr_1fr_1fr] gap-3 px-5 py-2 ${rowBg} text-sm border-b border-gray-50`}>
              <div className="font-medium text-gray-900 truncate">{item.product?.name || item.productName}</div>
              <div className="text-center">{invLink}</div>
              <div className="text-right text-gray-600">{qtyDisplay}</div>
              <div className="text-right text-gray-600">{formatPrice(priceWithVat)}</div>
              <div className="text-right font-semibold text-gray-900">{formatPrice(rowTotal)}</div>
            </div>
          )
        })}

        {/* Subtotals */}
        {(shippingTotal !== 0 || discountTotal !== 0) && (() => {
          const colGrid   = isVatPayer ? 'grid-cols-[3fr_0.7fr_repeat(6,1fr)]' : 'grid-cols-[2fr_0.7fr_1fr_1fr_1fr]'
          const labelSpan = isVatPayer ? 'col-span-7' : 'col-span-4'
          return (
            <>
              <div className={`grid ${colGrid} gap-2 px-5 py-2 bg-gray-50 border-t border-gray-100 text-sm`}>
                <div className={`${labelSpan} text-gray-500`}>Mezisoučet</div>
                <div className={`${isVatPayer ? 'text-center' : 'text-right'} font-medium text-gray-800`}>
                  {formatPrice(catalogSubtotal)}
                </div>
              </div>
              {shippingTotal !== 0 && (
                <div className={`grid ${colGrid} gap-2 px-5 py-2 bg-blue-50/60 border-t border-blue-100 text-sm`}>
                  <div className={`${labelSpan} font-medium text-gray-900`}>{shippingItem?.productName || 'Doprava'}</div>
                  <div className={`${isVatPayer ? 'text-center' : 'text-right'} text-blue-700 font-medium`}>{formatPrice(shippingTotal)}</div>
                </div>
              )}
              {discountTotal !== 0 && (
                <div className={`grid ${colGrid} gap-2 px-5 py-2 bg-yellow-50/60 border-t border-yellow-100 text-sm`}>
                  <div className={`${labelSpan} font-medium text-gray-900`}>{discountItem?.productName || 'Sleva'}</div>
                  <div className={`${isVatPayer ? 'text-center' : 'text-right'} text-red-600 font-medium`}>{formatPrice(discountTotal)}</div>
                </div>
              )}
            </>
          )
        })()}

        {/* Grand total */}
        <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_0.7fr_repeat(6,1fr)]' : 'grid-cols-[2fr_0.7fr_1fr_1fr_1fr]'} gap-2 px-5 py-3 bg-gray-100 font-bold border-t border-gray-200 text-sm`}>
          <div className={isVatPayer ? 'col-span-7' : 'col-span-4'}>
            {isVatPayer ? 'Celková částka s DPH' : 'Celková částka'}
          </div>
          <div className={isVatPayer ? 'text-center' : 'text-right'}>{formatPrice(Number(order.totalAmount))}</div>
        </div>
        </div>{/* end min-w wrapper */}
      </div>
    </ERPSectionCard>
  )
}
