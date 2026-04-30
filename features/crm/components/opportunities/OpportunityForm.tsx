'use client'

import { X } from 'lucide-react'
import type { CrmOpportunityFormData, OpportunityStage } from '../../types'
import { OPPORTUNITY_STAGE_LABELS } from '../../types'

interface Props {
  formData:     CrmOpportunityFormData
  setFormData:  (d: CrmOpportunityFormData) => void
  onSubmit:     (e: React.FormEvent) => void
  onClose:      () => void
  isEditing:    boolean
  isSubmitting: boolean
  error:        string | null
}

const STAGES: OpportunityStage[] = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

export function OpportunityForm({ formData, setFormData, onSubmit, onClose, isEditing, isSubmitting, error }: Props) {
  function set(field: keyof CrmOpportunityFormData, value: string) {
    setFormData({ ...formData, [field]: value })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{isEditing ? 'Upravit příležitost' : 'Nová příležitost'}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Název příležitosti *</label>
            <input type="text" value={formData.title} onChange={e => set('title', e.target.value)}
              required placeholder="Např. Roční kontrakt na dodávky..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fáze</label>
            <select value={formData.stage} onChange={e => set('stage', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500">
              {STAGES.map(s => <option key={s} value={s}>{OPPORTUNITY_STAGE_LABELS[s]}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hodnota</label>
              <input type="number" min="0" step="0.01" value={formData.value} onChange={e => set('value', e.target.value)}
                placeholder="0"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Měna</label>
              <select value={formData.currency} onChange={e => set('currency', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="CZK">CZK</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pravděp. %</label>
              <input type="number" min="0" max="100" value={formData.probability} onChange={e => set('probability', e.target.value)}
                placeholder="50"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Předpokládané uzavření</label>
            <input type="date" value={formData.expectedCloseAt} onChange={e => set('expectedCloseAt', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Popis</label>
            <textarea value={formData.description} onChange={e => set('description', e.target.value)} rows={3}
              placeholder="Co zahrnuje tato příležitost..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Zrušit
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Ukládám...' : isEditing ? 'Uložit' : 'Vytvořit příležitost'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
