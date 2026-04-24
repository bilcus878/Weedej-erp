import { X, Save } from 'lucide-react'
import type { InventuraStats } from '../types'

interface Props {
  stats: InventuraStats
  saving: boolean
  onCancel: () => void
  onSave: () => void
}

export function InventuraActionBar({ stats, saving, onCancel, onSave }: Props) {
  const pct = stats.total > 0 ? Math.round((stats.checked / stats.total) * 100) : 0

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-5 py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">
            Zkontrolováno{' '}
            <span className="text-orange-600 font-semibold">{stats.checked}</span>
            {' '}z{' '}
            <span className="font-semibold text-gray-900">{stats.total}</span>
          </span>
          <span className="text-sm font-semibold text-gray-600">{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X className="h-4 w-4" />
          Zrušit
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Ukládám…' : 'Uložit inventuru'}
        </button>
      </div>
    </div>
  )
}
