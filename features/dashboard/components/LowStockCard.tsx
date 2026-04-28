'use client'

import { Package, ArrowRight, AlertCircle, XCircle, CheckCircle } from 'lucide-react'
import type { InventorySummaryItem } from '../types'

export function LowStockCard({ items }: { items: InventorySummaryItem[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${items.length > 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
            <Package className={`h-4 w-4 ${items.length > 0 ? 'text-amber-600' : 'text-emerald-500'}`} />
          </div>
          <span className="text-sm font-semibold text-gray-900">Stav skladu</span>
          {items.length > 0 && (
            <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
              {items.length} produktů
            </span>
          )}
        </div>
        <a href="/inventory" className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors">
          Sklad <ArrowRight className="h-3 w-3" />
        </a>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-emerald-600">
          <CheckCircle className="h-8 w-8 mb-2 opacity-70" />
          <p className="text-sm font-medium">Sklad v pořádku</p>
          <p className="text-xs text-gray-400 mt-0.5">Žádné produkty s nízkým zásobou</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 overflow-y-auto max-h-72">
          {items.map(item => (
            <a
              key={item.productId}
              href="/inventory"
              className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0">
                {item.stockStatus === 'empty'
                  ? <XCircle className="h-4 w-4 text-red-500" />
                  : <AlertCircle className="h-4 w-4 text-amber-500" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
              </div>
              <div className="flex-shrink-0">
                {item.stockStatus === 'empty' ? (
                  <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    Vyprodáno
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    {item.physicalStock} {item.unit}
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
