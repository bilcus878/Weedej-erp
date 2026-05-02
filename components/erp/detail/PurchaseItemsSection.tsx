'use client'

import Link from 'next/link'
import { Package } from 'lucide-react'
import { formatPrice } from '@/lib/shared/finance/money'
import { ERPSectionCard } from './ERPSectionCard'
import type { SupplierOrderDetailItem } from './SupplierOrderDetailTypes'

export interface PurchaseItemsSectionProps {
  items: SupplierOrderDetailItem[]
  isVatPayer: boolean
  inventoryLookup?: Record<string, string>  // productId → inventoryItemId
  discountAmount?: number | null
  totalAmount: number
  title?: string
}

export function PurchaseItemsSection({
  items, isVatPayer, inventoryLookup = {}, discountAmount, totalAmount,
  title = 'Položky',
}: PurchaseItemsSectionProps) {
  if (items.length === 0) {
    return (
      <ERPSectionCard title={title} icon={<Package />}>
        <p className="text-sm text-gray-500 italic py-2">Objednávka nemá žádné položky.</p>
      </ERPSectionCard>
    )
  }

  const subtotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.priceWithVat), 0)
  const hasDiscount = (discountAmount ?? 0) > 0

  return (
    <ERPSectionCard title={`${title} (${items.length})`} icon={<Package />} className="overflow-hidden">
      <div className="-mx-5 -my-4 overflow-x-auto">
        {/* Header */}
        {isVatPayer ? (
          <div className="grid grid-cols-[2fr_auto_1fr_1fr_1fr_0.6fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-200 min-w-[700px]">
            <div>Produkt</div>
            <div className="text-center w-16">Pohyb</div>
            <div className="text-center">Obj.</div>
            <div className="text-center">Přijato</div>
            <div className="text-center">Zbývá</div>
            <div className="text-center">DPH</div>
            <div className="text-right">Cena/ks</div>
            <div className="text-right">DPH/ks</div>
            <div className="text-right">S DPH</div>
            <div className="text-right">Celkem</div>
          </div>
        ) : (
          <div className="grid grid-cols-[2fr_auto_1fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-200 min-w-[500px]">
            <div>Produkt</div>
            <div className="text-center w-16">Pohyb</div>
            <div className="text-center">Objednáno</div>
            <div className="text-center">Přijato</div>
            <div className="text-center">Zbývá</div>
            <div className="text-right">Cena/ks</div>
            <div className="text-right">Celkem</div>
          </div>
        )}

        {/* Rows */}
        {items.map((item, i) => {
          const ordered      = Number(item.quantity)
          const received     = Number(item.alreadyReceivedQuantity ?? 0)
          const remaining    = ordered - received
          const unitPrice    = Number(item.price)
          const vatRate      = Number(item.vatRate)
          const vatPerUnit   = Number(item.vatAmount)
          const priceWithVat = Number(item.priceWithVat)
          const rowTotal     = ordered * priceWithVat

          let bg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
          if (received >= ordered && ordered > 0) bg = 'bg-green-50'
          else if (received > 0) bg = 'bg-orange-50'

          const invMovId = item.productId ? (inventoryLookup[item.productId] ?? null) : null
          const invLink  = item.productId == null
            ? <span className="text-gray-300 text-xs">—</span>
            : invMovId
              ? (
                <Link
                  href={`/inventory?selectedProduct=${item.productId}&highlightMovement=${invMovId}`}
                  className="inline-flex items-center px-2 py-0.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded border border-green-200 transition-colors whitespace-nowrap"
                  onClick={e => e.stopPropagation()}
                >
                  Zobrazit
                </Link>
              )
              : <span className="text-xs text-gray-400 italic">Čeká</span>

          const receivedColor = received > 0 ? 'text-green-700 font-medium' : 'text-gray-500'
          const remainingColor = remaining === 0 ? 'text-green-700' : remaining < ordered ? 'text-amber-600' : 'text-gray-700'

          return isVatPayer ? (
            <div key={item.id} className={`grid grid-cols-[2fr_auto_1fr_1fr_1fr_0.6fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-2.5 text-xs border-b border-gray-100 last:border-0 ${bg} min-w-[700px]`}>
              <div className="font-medium text-gray-900 truncate">{item.product?.name || item.productName}</div>
              <div className="text-center w-16">{invLink}</div>
              <div className="text-center text-gray-600">{ordered} {item.unit}</div>
              <div className={`text-center ${receivedColor}`}>{received} {item.unit}</div>
              <div className={`text-center font-medium ${remainingColor}`}>{remaining.toFixed(3)} {item.unit}</div>
              <div className="text-center text-gray-500">{vatRate}%</div>
              <div className="text-right text-gray-600">{formatPrice(unitPrice)}</div>
              <div className="text-right text-gray-500">{formatPrice(vatPerUnit)}</div>
              <div className="text-right text-gray-700">{formatPrice(priceWithVat)}</div>
              <div className="text-right font-semibold text-gray-900">{formatPrice(rowTotal)}</div>
            </div>
          ) : (
            <div key={item.id} className={`grid grid-cols-[2fr_auto_1fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-2.5 text-xs border-b border-gray-100 last:border-0 ${bg} min-w-[500px]`}>
              <div className="font-medium text-gray-900 truncate">{item.product?.name || item.productName}</div>
              <div className="text-center w-16">{invLink}</div>
              <div className="text-center text-gray-600">{ordered} {item.unit}</div>
              <div className={`text-center ${receivedColor}`}>{received} {item.unit}</div>
              <div className={`text-center font-medium ${remainingColor}`}>{remaining.toFixed(3)} {item.unit}</div>
              <div className="text-right text-gray-600">{formatPrice(unitPrice)}</div>
              <div className="text-right font-semibold text-gray-900">{formatPrice(ordered * unitPrice)}</div>
            </div>
          )
        })}

        {/* Totals footer */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-sm">
          {hasDiscount ? (
            <>
              <div className="flex justify-between text-gray-600 py-1">
                <span>Mezisoučet</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-red-600 py-1">
                <span>Sleva dodavatele</span>
                <span>−{formatPrice(discountAmount!)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                <span>{isVatPayer ? 'Celkem s DPH' : 'Celkem'}</span>
                <span>{formatPrice(Number(totalAmount))}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between font-bold text-gray-900">
              <span>{isVatPayer ? 'Celkem s DPH' : 'Celkem'}</span>
              <span>{formatPrice(Number(totalAmount))}</span>
            </div>
          )}
        </div>
      </div>
    </ERPSectionCard>
  )
}
