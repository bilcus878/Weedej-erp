'use client'

import { ExternalLink } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { CreditNoteData } from '../types'

interface Props {
  creditNotes: CreditNoteData[]
}

export function CreditNotesList({ creditNotes }: Props) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">
        Dobropisy ({creditNotes.length})
      </h4>

      {creditNotes.length === 0 ? (
        <div className="px-4 py-3 text-sm text-gray-500">
          K této faktuře nejsou vystaveny žádné dobropisy.
        </div>
      ) : (
        <div className="text-sm">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b">
            <div>Číslo dobropisu</div>
            <div>Datum</div>
            <div className="text-center">Položek</div>
            <div className="text-right">Částka</div>
            <div className="w-4" />
          </div>

          {creditNotes.map((cn, idx) => (
            <a
              key={cn.id}
              href={`/credit-notes?highlight=${cn.id}`}
              className={`grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 hover:bg-purple-50 transition-colors items-center ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-purple-600 hover:underline text-sm">{cn.creditNoteNumber}</span>
                {cn.status === 'storno' && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">STORNO</span>
                )}
              </div>
              <div className="text-sm text-gray-700">{new Date(cn.creditNoteDate).toLocaleDateString('cs-CZ')}</div>
              <div className="text-sm text-gray-700 text-center">{cn.items?.length || 0}</div>
              <div className="text-sm font-semibold text-red-600 text-right">{formatPrice(cn.totalAmount)}</div>
              <div className="flex justify-end"><ExternalLink className="w-4 h-4 text-purple-600" /></div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
