'use client'

import Link from 'next/link'
import { Package } from 'lucide-react'
import { ERPSectionCard } from './ERPSectionCard'
import type { SupplierOrderDetailReceipt } from './SupplierOrderDetailTypes'

export interface LinkedReceiptsSectionProps {
  receipts: SupplierOrderDetailReceipt[]
  title?: string
}

export function LinkedReceiptsSection({ receipts, title = 'Příjemky' }: LinkedReceiptsSectionProps) {
  const active = receipts.filter(r => r.status !== 'storno')
  const storno = receipts.filter(r => r.status === 'storno')

  if (receipts.length === 0) return null

  function receiptTotal(r: SupplierOrderDetailReceipt): number {
    return r.items.reduce((sum, item) => {
      const qty = item.receivedQuantity ?? item.quantity
      return sum + Number(qty) * Number(item.purchasePrice)
    }, 0)
  }

  return (
    <ERPSectionCard title={`${title} (${receipts.length})`} icon={<Package />}>
      <div className="space-y-2">
        {active.map(r => (
          <Link
            key={r.id}
            href={`/receipts/${r.id}`}
            className="flex items-center justify-between gap-3 px-3 py-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-sm font-semibold text-green-800 shrink-0">{r.receiptNumber}</span>
              <span className="text-xs text-green-600">{new Date(r.receiptDate).toLocaleDateString('cs-CZ')}</span>
              <span className="text-xs text-green-500">{r.items.length} pol.</span>
            </div>
            <span className="text-sm font-bold text-green-900 shrink-0">
              {Math.round(receiptTotal(r)).toLocaleString('cs-CZ')} Kč
            </span>
          </Link>
        ))}
        {storno.map(r => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg opacity-60"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-sm font-semibold text-red-700 line-through shrink-0">{r.receiptNumber}</span>
              <span className="text-xs text-red-500">{new Date(r.receiptDate).toLocaleDateString('cs-CZ')}</span>
              <span className="text-xs text-red-400 font-medium">STORNO</span>
            </div>
          </div>
        ))}
      </div>
    </ERPSectionCard>
  )
}
