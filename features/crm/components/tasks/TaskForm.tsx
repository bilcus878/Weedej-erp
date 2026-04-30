'use client'

import { X } from 'lucide-react'
import type { CrmTaskFormData, TaskType, TaskPriority } from '../../types'
import { TASK_TYPE_LABELS, TASK_PRIORITY_LABELS } from '../../types'

interface Props {
  formData:     CrmTaskFormData
  setFormData:  (d: CrmTaskFormData) => void
  onSubmit:     (e: React.FormEvent) => void
  onClose:      () => void
  isEditing:    boolean
  isSubmitting: boolean
  error:        string | null
}

const TYPES:      TaskType[]     = ['follow_up', 'call_back', 'send_email', 'demo', 'send_quote', 'other']
const PRIORITIES: TaskPriority[] = ['low', 'normal', 'high', 'urgent']

export function TaskForm({ formData, setFormData, onSubmit, onClose, isEditing, isSubmitting, error }: Props) {
  function set(field: keyof CrmTaskFormData, value: string) {
    setFormData({ ...formData, [field]: value })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{isEditing ? 'Upravit úkol' : 'Nový úkol'}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Název úkolu *</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Co je potřeba udělat..."
              required
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Typ</label>
              <select value={formData.type} onChange={e => set('type', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {TYPES.map(t => <option key={t} value={t}>{TASK_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Priorita</label>
              <select value={formData.priority} onChange={e => set('priority', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {PRIORITIES.map(p => <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Termín</label>
            <input
              type="date"
              value={formData.dueAt}
              onChange={e => set('dueAt', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Popis</label>
            <textarea
              value={formData.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              placeholder="Detaily úkolu..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Zrušit
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Ukládám...' : isEditing ? 'Uložit změny' : 'Vytvořit úkol'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
