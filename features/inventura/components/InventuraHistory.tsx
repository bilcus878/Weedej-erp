import { History, ClipboardList, ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import type { InventuraRecord } from '../types'

interface Props {
  history: InventuraRecord[]
  open: boolean
  onToggle: () => void
  onSelect: (id: string) => void
}

export function InventuraHistory({ history, open, onToggle, onSelect }: Props) {
  return (
    <Card>
      <CardContent className="p-6">
        <button
          className="flex items-center justify-between w-full text-left"
          onClick={onToggle}
        >
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <History className="h-5 w-5 text-orange-500" />
            Historie inventur
            <span className="ml-1 text-sm font-normal text-gray-400">({history.length})</span>
          </h3>
          {open
            ? <ChevronDown  className="h-5 w-5 text-gray-400" />
            : <ChevronRight className="h-5 w-5 text-gray-400" />
          }
        </button>

        {open && (
          <div className="mt-4">
            {history.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">
                Zatím nebyla provedena žádná inventura
              </p>
            ) : (
              <div className="space-y-2">
                {history.map(inv => (
                  <button
                    key={inv.id}
                    onClick={() => onSelect(inv.id)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <ClipboardList className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{inv.inventuraNumber}</p>
                        <p className="text-xs text-gray-400">{formatDate(inv.inventuraDate)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 text-sm">
                      <Stat label="produktů"  value={inv.totalProducts} />
                      <Stat
                        label="rozdílů"
                        value={inv.differencesCount}
                        className={inv.differencesCount > 0 ? 'text-orange-600' : 'text-green-600'}
                      />
                      {inv.surplusCount > 0 && (
                        <Stat label="přebytků" value={`+${inv.surplusCount}`} className="text-green-600" />
                      )}
                      {inv.shortageCount > 0 && (
                        <Stat label="mank"     value={`-${inv.shortageCount}`} className="text-red-600" />
                      )}
                      <Eye className="h-4 w-4 text-gray-300 ml-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({
  label, value, className = 'text-gray-900',
}: { label: string; value: string | number; className?: string }) {
  return (
    <div className="text-center">
      <p className={`font-semibold ${className}`}>{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  )
}
