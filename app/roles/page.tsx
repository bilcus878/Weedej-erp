'use client'

import { useState } from 'react'
import { ShieldCheck, Settings2, Trash2, Plus, RefreshCw, Users } from 'lucide-react'
import { useRoles, PermissionsMatrix } from '@/features/roles'
import { deleteRole, createRole } from '@/features/roles/services/roleService'
import { LoadingState, ErrorState } from '@/components/erp'
import type { Role } from '@/features/roles/types'

export const dynamic = 'force-dynamic'

export default function RolesPage() {
  const { roles, permissions, permissionsByModule, loading, error, refresh } = useRoles()
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [creating, setCreating]       = useState(false)
  const [newName, setNewName]         = useState('')
  const [newDisplay, setNewDisplay]   = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={refresh} />

  async function handleCreate() {
    if (!newName.trim() || !newDisplay.trim()) {
      setCreateError('Název a zobrazený název jsou povinné')
      return
    }
    try {
      await createRole({ name: newName, displayName: newDisplay })
      setCreating(false)
      setNewName('')
      setNewDisplay('')
      setCreateError(null)
      refresh()
    } catch (e: any) {
      setCreateError(e.message)
    }
  }

  async function handleDelete(role: Role) {
    if (!confirm(`Opravdu smazat roli "${role.displayName}"?`)) return
    try {
      await deleteRole(role.id)
      refresh()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Role a oprávnění</h1>
            <p className="text-xs text-gray-400">{roles.length} rolí · {permissions.length} oprávnění</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setCreating(true); setCreateError(null) }}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nová role
          </button>
        </div>
      </div>

      {/* Create role inline form */}
      {creating && (
        <div className="mb-4 p-4 bg-white border border-violet-200 rounded-xl shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Vytvořit roli</h3>
          {createError && <p className="text-xs text-red-600">{createError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <input
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              placeholder="Název (ANALYST)"
              value={newName}
              onChange={e => setNewName(e.target.value.toUpperCase())}
            />
            <input
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              placeholder="Zobrazený název"
              value={newDisplay}
              onChange={e => setNewDisplay(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors">
              Vytvořit
            </button>
            <button onClick={() => setCreating(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
              Zrušit
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {roles.map(role => {
          const permCount  = role.rolePermissions.length
          const userCount  = role._count?.userRoles ?? 0

          return (
            <div key={role.id} className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-900">{role.displayName}</h2>
                    {role.isSystem && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                        Systémová
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{role.name}</p>
                  {role.description && <p className="text-xs text-gray-500 mt-1">{role.description}</p>}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingRole(role)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    title="Upravit oprávnění"
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>
                  {!role.isSystem && (
                    <button
                      onClick={() => handleDelete(role)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Smazat roli"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                  {permCount} oprávnění
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  {userCount} uživatelů
                </span>
              </div>

              {/* Permission pills preview */}
              <div className="flex flex-wrap gap-1">
                {role.rolePermissions.slice(0, 6).map(rp => (
                  <span key={rp.permission.id} className="text-[11px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                    {rp.permission.name}
                  </span>
                ))}
                {permCount > 6 && (
                  <span className="text-[11px] px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded-md">
                    +{permCount - 6} dalších
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {editingRole && (
        <PermissionsMatrix
          role={editingRole}
          allPermissions={permissions}
          permissionsByModule={permissionsByModule}
          onSaved={() => { setEditingRole(null); refresh() }}
          onClose={() => setEditingRole(null)}
        />
      )}
    </div>
  )
}
