'use client'

import { useState } from 'react'
import { Loader2, Save, X } from 'lucide-react'
import { updateRolePermissions } from '../services/roleService'
import type { Role, Permission, PermissionsByModule } from '../types'

interface Props {
  role:                Role
  allPermissions:      Permission[]
  permissionsByModule: PermissionsByModule
  onSaved:             () => void
  onClose:             () => void
}

export function PermissionsMatrix({ role, allPermissions, permissionsByModule, onSaved, onClose }: Props) {
  const initialSelected = new Set(role.rolePermissions.map(rp => rp.permission.id))
  const [selected, setSelected] = useState<Set<string>>(initialSelected)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  function toggle(id: string) {
    if (role.isSystem) return
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleModule(ids: string[]) {
    if (role.isSystem) return
    const allSelected = ids.every(id => selected.has(id))
    setSelected(prev => {
      const next = new Set(prev)
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id))
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await updateRolePermissions(role.id, [...selected])
      onSaved()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const modules = Object.keys(permissionsByModule).sort()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Oprávnění — {role.displayName}
            </h2>
            {role.isSystem && (
              <p className="text-xs text-amber-600 mt-0.5">Systémová role — oprávnění nelze měnit</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {modules.map(mod => {
            const perms   = permissionsByModule[mod]
            const permIds = perms.map(p => p.id)
            const allMod  = permIds.every(id => selected.has(id))
            const someMod = permIds.some(id => selected.has(id))

            return (
              <div key={mod}>
                <div className="flex items-center gap-3 mb-2">
                  <input
                    type="checkbox"
                    disabled={role.isSystem}
                    checked={allMod}
                    ref={el => { if (el) el.indeterminate = someMod && !allMod }}
                    onChange={() => toggleModule(permIds)}
                    className="w-4 h-4 rounded text-violet-600 border-gray-300 focus:ring-violet-500"
                  />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{mod}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 ml-7">
                  {perms.map(p => (
                    <label key={p.id} className={`flex items-center gap-2 text-sm ${role.isSystem ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        disabled={role.isSystem}
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p.id)}
                        className="w-4 h-4 rounded text-violet-600 border-gray-300 focus:ring-violet-500"
                      />
                      <span className="text-gray-700">{p.displayName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <span className="text-xs text-gray-400">{selected.size} / {allPermissions.length} oprávnění</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
              Zavřít
            </button>
            {!role.isSystem && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Uložit oprávnění
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
