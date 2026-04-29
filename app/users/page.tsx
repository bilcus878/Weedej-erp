'use client'

import { useState } from 'react'
import { Users, Plus, Edit2, Trash2, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { useUsers, useUserForm, UserFormModal } from '@/features/users'
import { useRoles } from '@/features/roles'
import { LoadingState, ErrorState } from '@/components/erp'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default function UsersPage() {
  const { users, loading, error, refresh } = useUsers()
  const { roles } = useRoles()
  const form = useUserForm(refresh)

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={refresh} />

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Správa uživatelů</h1>
            <p className="text-xs text-gray-400">{users.length} uživatelů</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={form.openNew}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nový uživatel
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Uživatel</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stav</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vytvořen</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                      <span className="text-violet-700 text-xs font-bold uppercase">{user.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.userRoles.length === 0 ? (
                      <span className="text-xs text-gray-400">Bez role</span>
                    ) : user.userRoles.map(ur => (
                      <span key={ur.role.name} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100">
                        {ur.role.displayName}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => form.handleToggleActive(user)}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                      user.isActive
                        ? 'text-green-600 hover:text-green-700'
                        : 'text-gray-400 hover:text-gray-500'
                    }`}
                  >
                    {user.isActive
                      ? <><CheckCircle className="w-4 h-4" />Aktivní</>
                      : <><XCircle    className="w-4 h-4" />Neaktivní</>
                    }
                  </button>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {format(new Date(user.createdAt), 'dd. MM. yyyy', { locale: cs })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => form.openEdit(user)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Upravit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => form.handleDelete(user)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Smazat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                  Žádní uživatelé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <UserFormModal
        open={form.open}
        editing={form.editing}
        form={form.form}
        saving={form.saving}
        error={form.error}
        roles={roles}
        onChange={patch => form.setForm(prev => ({ ...prev, ...patch }))}
        onSubmit={form.handleSubmit}
        onClose={form.close}
      />
    </div>
  )
}
