'use client'

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { ErpUser, UserFormData } from '../types'
import type { Role } from '@/features/roles/types'

interface Props {
  open:    boolean
  editing: ErpUser | null
  form:    UserFormData
  saving:  boolean
  error:   string | null
  roles:   Role[]
  onChange: (patch: Partial<UserFormData>) => void
  onSubmit: (roleIds: string[]) => void
  onClose:  () => void
}

export function UserFormModal({ open, editing, form, saving, error, roles, onChange, onSubmit, onClose }: Props) {
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      const currentIds = editing
        ? editing.userRoles.map(ur => ur.role.id)
        : []
      setSelectedRoleIds(currentIds)
    }
  }, [open, editing])

  if (!open) return null

  function toggleRole(id: string) {
    setSelectedRoleIds(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {editing ? 'Upravit uživatele' : 'Nový uživatel'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Jméno *</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                value={form.name}
                onChange={e => onChange({ name: e.target.value })}
                placeholder="Jan Novák"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                disabled={!!editing}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:bg-gray-50 disabled:text-gray-400"
                value={form.email}
                onChange={e => onChange({ email: e.target.value })}
                placeholder="jan@firma.cz"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {editing ? 'Nové heslo (prázdné = beze změny)' : 'Heslo *'}
            </label>
            <input
              type="password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              value={form.password}
              onChange={e => onChange({ password: e.target.value })}
              placeholder="min. 8 znaků"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Role</label>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {roles.map(role => (
                <label key={role.id} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-violet-600 border-gray-300 focus:ring-violet-500"
                    checked={selectedRoleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-800">{role.displayName}</span>
                    {role.description && (
                      <span className="text-xs text-gray-400 ml-2">{role.description}</span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Zrušit
          </button>
          <button
            onClick={() => onSubmit(selectedRoleIds)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editing ? 'Uložit' : 'Vytvořit'}
          </button>
        </div>
      </div>
    </div>
  )
}
