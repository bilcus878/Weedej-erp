import { X, ClipboardList, Search, Filter, TrendingUp, TrendingDown, Check } from 'lucide-react'
import Input from '@/components/ui/Input'
import { formatDate, formatQuantity } from '@/lib/utils'
import type { InventuraDetail, InventuraDetailItem } from '../types'

interface Props {
  detail: InventuraDetail
  filteredItems: InventuraDetailItem[]
  loadingDetail: boolean
  historySearch: string
  setHistorySearch: (v: string) => void
  historyShowOnlyDiffs: boolean
  setHistoryShowOnlyDiffs: (v: boolean) => void
  onClose: () => void
}

export function InventuraDetailModal({
  detail, filteredItems, loadingDetail,
  historySearch, setHistorySearch,
  historyShowOnlyDiffs, setHistoryShowOnlyDiffs,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">

        {/* Modal header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">{detail.inventuraNumber}</h2>
              <p className="text-orange-100 text-sm">{formatDate(detail.inventuraDate)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-orange-100 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-5 gap-2 p-4 bg-gray-50 border-b flex-shrink-0">
          {([
            { label: 'Celkem',       value: detail.totalProducts,    color: 'text-gray-900'   },
            { label: 'Zkontrolováno',value: detail.checkedProducts,  color: 'text-blue-600'   },
            { label: 'Rozdílů',      value: detail.differencesCount, color: 'text-purple-600' },
            { label: 'Přebytků',     value: detail.surplusCount,     color: 'text-green-600'  },
            { label: 'Mank',         value: detail.shortageCount,    color: 'text-red-600'    },
          ]).map(s => (
            <div key={s.label} className="text-center p-2 bg-white rounded border border-gray-100">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Hledat produkt…"
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <button
            onClick={() => setHistoryShowOnlyDiffs(!historyShowOnlyDiffs)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              historyShowOnlyDiffs
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="h-4 w-4" />
            Jen rozdíly
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-4">
          {loadingDetail ? (
            <div className="text-center py-12 text-gray-400 text-sm">Načítání…</div>
          ) : (
            <div className="bg-white rounded-lg border">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-3 bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase tracking-wide">
                <div>Produkt</div>
                <div className="text-center">Systém</div>
                <div className="text-center">Skutečnost</div>
                <div className="text-center">Rozdíl</div>
              </div>

              <div className="divide-y max-h-[400px] overflow-y-auto">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">Žádné položky</div>
                ) : (
                  filteredItems.map(item => (
                    <div
                      key={item.id}
                      className={`grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 ${
                        item.differenceType === 'surplus' ? 'bg-green-50'
                        : item.differenceType === 'shortage' ? 'bg-red-50'
                        : ''
                      }`}
                    >
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{item.productName}</p>
                        <p className="text-xs text-gray-400">{item.category ?? 'Bez kategorie'}</p>
                      </div>
                      <div className="text-center text-sm text-gray-700">
                        {formatQuantity(item.systemStock, item.unit)}
                      </div>
                      <div className="text-center text-sm font-medium text-gray-900">
                        {formatQuantity(item.actualStock, item.unit)}
                      </div>
                      <div className="text-center">
                        {item.differenceType !== 'none' ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            item.differenceType === 'surplus'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.differenceType === 'surplus'
                              ? <TrendingUp  className="h-3 w-3" />
                              : <TrendingDown className="h-3 w-3" />
                            }
                            {item.difference > 0 ? '+' : ''}{formatQuantity(item.difference, item.unit)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            <Check className="h-3 w-3" />
                            OK
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
