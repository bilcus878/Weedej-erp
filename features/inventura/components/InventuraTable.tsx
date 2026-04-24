import { TrendingUp, TrendingDown, Check } from 'lucide-react'
import { formatQuantity } from '@/lib/utils'
import type { InventuraItem } from '../types'

interface Props {
  items: InventuraItem[]
  onUpdateActualStock: (productId: string, value: string) => void
  onSetAsSystem: (productId: string) => void
}

export function InventuraTable({ items, onUpdateActualStock, onSetAsSystem }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_72px] items-center gap-4 px-4 py-3 bg-gray-50 border-b rounded-t-lg text-xs font-semibold text-gray-600 uppercase tracking-wide">
        <div>Produkt</div>
        <div className="text-center">Systém</div>
        <div className="text-center">Skutečnost</div>
        <div className="text-center">Rozdíl</div>
        <div className="text-center">Akce</div>
      </div>

      <div className="divide-y">
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            Žádné položky odpovídající filtru
          </div>
        ) : (
          items.map(item => {
            const actual = parseFloat(item.actualStock)
            const diff   = !isNaN(actual) ? actual - item.systemStock : null
            const hasDiff = diff !== null && diff !== 0

            return (
              <div
                key={item.productId}
                className={`grid grid-cols-[2fr_1fr_1fr_1fr_72px] items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50 ${
                  item.checked ? (hasDiff ? 'bg-amber-50' : 'bg-green-50') : ''
                }`}
              >
                <div>
                  <p className="font-medium text-gray-900 text-sm">{item.productName}</p>
                  <p className="text-xs text-gray-400">{item.category?.name ?? 'Bez kategorie'}</p>
                </div>

                <div className="text-center text-sm text-gray-700 font-medium">
                  {formatQuantity(item.systemStock, item.unit)}
                </div>

                <div className="text-center">
                  <input
                    type="number"
                    step="0.001"
                    value={item.actualStock}
                    onChange={e => onUpdateActualStock(item.productId, e.target.value)}
                    placeholder="?"
                    className={`w-full max-w-[100px] mx-auto px-2 py-1 border rounded text-center text-sm ${
                      item.checked
                        ? hasDiff
                          ? 'border-amber-400 bg-amber-50'
                          : 'border-green-400 bg-green-50'
                        : 'border-gray-300'
                    }`}
                  />
                </div>

                <div className="text-center">
                  {diff !== null ? (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      diff > 0 ? 'bg-green-100 text-green-800'
                      : diff < 0 ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                      {diff > 0 && <TrendingUp  className="h-3 w-3" />}
                      {diff < 0 && <TrendingDown className="h-3 w-3" />}
                      {diff === 0 && <Check className="h-3 w-3" />}
                      {diff > 0 ? '+' : ''}{formatQuantity(diff, item.unit)}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-sm">—</span>
                  )}
                </div>

                <div className="text-center">
                  <button
                    onClick={() => onSetAsSystem(item.productId)}
                    title="Nastavit jako systémovou hodnotu"
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded transition-colors"
                  >
                    =
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
