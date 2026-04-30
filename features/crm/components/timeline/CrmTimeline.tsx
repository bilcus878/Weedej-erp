'use client'

import { RefreshCw } from 'lucide-react'
import { useCrmTimeline } from '../../hooks/useCrmTimeline'
import { TimelineEventRow } from './TimelineEvent'

interface Props { customerId: string }

export function CrmTimeline({ customerId }: Props) {
  const { events, loading, error, refresh } = useCrmTimeline(customerId)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          Aktivita <span className="text-gray-400 font-normal">({events.length} záznamů)</span>
        </p>
        <button onClick={refresh} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-4 text-center">Načítám timeline...</p>
      ) : error ? (
        <p className="text-sm text-red-500 py-4 text-center">{error}</p>
      ) : events.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-sm">Žádná aktivita</p>
          <p className="text-xs mt-1">Zaznamenejte první interakci nebo objednávku</p>
        </div>
      ) : (
        <div className="pt-1">
          {events.map(e => (
            <TimelineEventRow key={`${e.type}-${e.id}`} event={e} />
          ))}
        </div>
      )}
    </div>
  )
}
