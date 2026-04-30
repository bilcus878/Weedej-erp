'use client'

import { X } from 'lucide-react'
import type { CrmContactFormData } from '../../types'

interface Props {
  formData:     CrmContactFormData
  setFormData:  (d: CrmContactFormData) => void
  onSubmit:     (e: React.FormEvent) => void
  onClose:      () => void
  isEditing:    boolean
  isSubmitting: boolean
  error:        string | null
}

export function ContactForm({ formData, setFormData, onSubmit, onClose, isEditing, isSubmitting, error }: Props) {
  function set(field: keyof CrmContactFormData, value: string | boolean) {
    setFormData({ ...formData, [field]: value })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{isEditing ? 'Upravit kontakt' : 'Nový kontakt'}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Jméno *</label>
              <input type="text" value={formData.firstName} onChange={e => set('firstName', e.target.value)}
                required placeholder="Jan"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Příjmení</label>
              <input type="text" value={formData.lastName} onChange={e => set('lastName', e.target.value)}
                placeholder="Novák"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Pozice / role</label>
            <input type="text" value={formData.role} onChange={e => set('role', e.target.value)}
              placeholder="Nákupčí, CEO, Office Manager..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={formData.email} onChange={e => set('email', e.target.value)}
                placeholder="jan@firma.cz"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Telefon</label>
              <input type="tel" value={formData.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+420 ..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Poznámka</label>
            <textarea value={formData.note} onChange={e => set('note', e.target.value)} rows={2}
              placeholder="Interní poznámka ke kontaktu..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formData.isPrimary}
              onChange={e => set('isPrimary', e.target.checked)}
              className="rounded text-blue-600" />
            <span className="text-sm text-gray-700">Primární kontakt zákazníka</span>
          </label>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Zrušit
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {isSubmitting ? 'Ukládám...' : isEditing ? 'Uložit' : 'Přidat kontakt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
