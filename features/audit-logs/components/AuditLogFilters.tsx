'use client'

import { Search, X } from 'lucide-react'
import type { AuditLogFilters } from '../types'

const MODULES = [
  'auth', 'customers', 'suppliers', 'products', 'inventory',
  'purchase-orders', 'customer-orders', 'invoices', 'receipts',
  'delivery-notes', 'transactions', 'users', 'roles', 'settings', 'eshop',
]

const ACTION_TYPES = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT']

interface Props {
  filters:  AuditLogFilters
  onChange: (patch: Partial<AuditLogFilters>) => void
  onClear:  () => void
}

export function AuditLogFiltersBar({ filters, onChange, onClear }: Props) {
  const hasActive = Object.values(filters).some(Boolean)

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
      {/* Module */}
      <div className="flex flex-col gap-1 min-w-[150px]">
        <label className="text-xs font-medium text-gray-500">Modul</label>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          value={filters.module}
          onChange={e => onChange({ module: e.target.value })}
        >
          <option value="">Vše</option>
          {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Action type */}
      <div className="flex flex-col gap-1 min-w-[150px]">
        <label className="text-xs font-medium text-gray-500">Akce</label>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          value={filters.actionType}
          onChange={e => onChange({ actionType: e.target.value })}
        >
          <option value="">Vše</option>
          {ACTION_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Date range */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Od</label>
        <input
          type="date"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          value={filters.dateFrom}
          onChange={e => onChange({ dateFrom: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Do</label>
        <input
          type="date"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          value={filters.dateTo}
          onChange={e => onChange({ dateTo: e.target.value })}
        />
      </div>

      {/* Entity name */}
      <div className="flex flex-col gap-1 min-w-[160px]">
        <label className="text-xs font-medium text-gray-500">Entita</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="Customer, Invoice…"
            value={filters.entityName}
            onChange={e => onChange({ entityName: e.target.value })}
          />
        </div>
      </div>

      {hasActive && (
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg hover:border-red-200 hover:bg-red-50 transition-colors self-end"
        >
          <X className="w-3.5 h-3.5" />
          Vymazat
        </button>
      )}
    </div>
  )
}
