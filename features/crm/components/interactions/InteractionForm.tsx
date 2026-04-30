'use client'

import { X } from 'lucide-react'
import type { CrmInteractionFormData, InteractionType } from '../../types'
import { INTERACTION_TYPE_LABELS } from '../../types'

interface Props {
  formData:    CrmInteractionFormData
  setFormData: (d: CrmInteractionFormData) => void
  onSubmit:    (e: React.FormEvent) => void
  onClose:     () => void
  isEditing:   boolean
  isSubmitting: boolean
  error:       string | null
}

const TYPES: InteractionType[] = ['call', 'email', 'meeting', 'note', 'visit', 'demo', 'other']

export function InteractionForm({ formData, setFormData, onSubmit, onClose, isEditing, isSubmitting, error }: Props) {
  function set(field: keyof CrmInteractionFormData, value: string | boolean) {
    setFormData({ ...formData, [field]: value })
  }

  const showDirection = ['call', 'email'].includes(formData.type)
  const showDuration  = ['call', 'meeting', 'visit', 'demo'].includes(formData.type)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{isEditing ? 'Upravit interakci' : 'Zaznamenat interakci'}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Typ *</label>
              <select
                value={formData.type}
                onChange={e => set('type', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TYPES.map(t => <option key={t} value={t}>{INTERACTION_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Datum a čas *</label>
              <input
                type="datetime-local"
                value={formData.occurredAt}
                onChange={e => set('occurredAt', e.target.value)}
                required
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {showDirection && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Směr</label>
              <div className="flex gap-3">
                {[{ v: 'inbound', l: 'Příchozí' }, { v: 'outbound', l: 'Odchozí' }].map(({ v, l }) => (
                  <label key={v} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                    <input type="radio" name="direction" value={v}
                      checked={formData.direction === v}
                      onChange={() => set('direction', v)}
                      className="text-blue-600"
                    />
                    {l}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Předmět *</label>
            <input
              type="text"
              value={formData.subject}
              onChange={e => set('subject', e.target.value)}
              placeholder="Stručný popis..."
              required
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {showDuration && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Délka (minuty)</label>
              <input
                type="number"
                min="1"
                value={formData.durationMin}
                onChange={e => set('durationMin', e.target.value)}
                placeholder="např. 30"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Poznámky</label>
            <textarea
              value={formData.body}
              onChange={e => set('body', e.target.value)}
              rows={3}
              placeholder="Průběh / obsah..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Výsledek / závěr</label>
            <input
              type="text"
              value={formData.outcome}
              onChange={e => set('outcome', e.target.value)}
              placeholder="Např. Zájem, posílám nabídku do pátku..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Zrušit
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Ukládám...' : isEditing ? 'Uložit změny' : 'Zaznamenat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
