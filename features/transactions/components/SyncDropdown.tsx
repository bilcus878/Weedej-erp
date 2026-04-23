'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import Button from '@/components/ui/Button'

interface Props {
  syncing:  boolean
  onSync:   (fromDate: string) => Promise<void>
}

export function SyncDropdown({ syncing, onSync }: Props) {
  const [open,     setOpen]     = useState(false)
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split('T')[0])

  async function handleConfirm() {
    setOpen(false)
    await onSync(fromDate)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={syncing}
        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-lg shadow hover:from-emerald-600 hover:to-emerald-700 flex items-center gap-2 text-sm disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Synchronizuji...' : 'Synchronizovat ze SumUp'}
      </button>

      {open && !syncing && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Synchronizovat od data:</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Synchronizují se transakce od tohoto data do dnes</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleConfirm} className="flex-1" size="sm">Synchronizovat</Button>
              <Button onClick={() => setOpen(false)} variant="secondary" size="sm">Zrušit</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
