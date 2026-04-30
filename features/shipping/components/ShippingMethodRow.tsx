'use client'

import { Save, RotateCcw, Trash2, Loader2 } from 'lucide-react'
import type { ShippingMethod, ShippingProvider } from '../types'
import { PROVIDER_LABELS, PROVIDER_COLORS } from '../types'
import { COLS, inp, numInp } from '../constants'

interface Props {
  method:        ShippingMethod
  isDirty:       boolean
  saving:        string | null
  deleting:      string | null
  localValue:    <K extends keyof ShippingMethod>(id: string, field: K, fallback: ShippingMethod[K]) => ShippingMethod[K]
  onFieldChange: (id: string, field: keyof ShippingMethod, value: unknown) => void
  onToggleActive:(id: string, current: boolean) => void
  onSave:        (id: string) => void
  onCancel:      (id: string) => void
  onDelete:      (id: string) => void
}

export function ShippingMethodRow({
  method: m, isDirty, saving, deleting,
  localValue, onFieldChange, onToggleActive, onSave, onCancel, onDelete,
}: Props) {
  const isSaving  = saving === m.id
  const isDeleting = deleting === m.id
  const isCustom  = m.provider === 'custom'

  const name   = localValue(m.id, 'name',          m.name)
  const price  = localValue(m.id, 'price',         m.price)
  const free   = localValue(m.id, 'freeThreshold', m.freeThreshold)
  const cod    = localValue(m.id, 'codFee',        m.codFee)
  const days   = localValue(m.id, 'estimatedDays', m.estimatedDays)
  const note   = localValue(m.id, 'note',          m.note)
  const active = localValue(m.id, 'isActive',      m.isActive)

  return (
    <div className={`rounded-xl border transition-colors ${
      isDirty ? 'border-amber-300 bg-amber-50/40' : 'border-gray-100 bg-white hover:bg-gray-50/60'
    }`}>
      <div className={`grid ${COLS} gap-3 items-center px-4 py-3`}>

        {/* Name + provider badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${PROVIDER_COLORS[m.provider as ShippingProvider]}`}>
            {PROVIDER_LABELS[m.provider as ShippingProvider]}
          </span>
          {isCustom ? (
            <input
              value={String(name)}
              onChange={e => onFieldChange(m.id, 'name', e.target.value)}
              className={`${inp} flex-1 min-w-0`}
              placeholder="Název metody"
            />
          ) : (
            <span className="text-sm font-medium text-gray-800 truncate">{name}</span>
          )}
        </div>

        {/* Price */}
        <input
          type="number" min="0" step="1"
          value={price}
          onChange={e => onFieldChange(m.id, 'price', e.target.value === '' ? 0 : Number(e.target.value))}
          className={numInp}
        />

        {/* Free threshold */}
        <input
          type="number" min="0" step="1"
          value={free ?? ''}
          placeholder="—"
          onChange={e => onFieldChange(m.id, 'freeThreshold', e.target.value)}
          className={numInp}
        />

        {/* COD fee */}
        <input
          type="number" min="0" step="1"
          value={cod}
          onChange={e => onFieldChange(m.id, 'codFee', e.target.value === '' ? 0 : Number(e.target.value))}
          className={numInp}
        />

        {/* Estimated days */}
        <input
          value={String(days)}
          onChange={e => onFieldChange(m.id, 'estimatedDays', e.target.value)}
          className={inp}
          placeholder="2-3"
        />

        {/* Active toggle */}
        <button
          type="button"
          onClick={() => onToggleActive(m.id, Boolean(active))}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none ${
            active ? 'bg-green-500' : 'bg-gray-200'
          }`}
        >
          <span className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow-sm transform transition-transform ${
            active ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>

        {/* Row actions */}
        <div className="flex items-center gap-1">
          {isCustom && !isDirty && (
            <button
              type="button"
              onClick={() => onDelete(m.id)}
              disabled={isDeleting}
              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {isDeleting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Trash2  className="w-3.5 h-3.5" />}
            </button>
          )}
          {isDirty && (
            <>
              <button
                type="button"
                onClick={() => onSave(m.id)}
                disabled={isSaving}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Uložit
              </button>
              <button
                type="button"
                onClick={() => onCancel(m.id)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Note row */}
      {(isDirty || note) && (
        <div className="px-4 pb-3 grid grid-cols-[auto_1fr] gap-2 items-center border-t border-dashed border-gray-100 pt-2.5">
          <span className="text-xs text-gray-400 font-medium shrink-0">Poznámka</span>
          <input
            value={String(note ?? '')}
            onChange={e => onFieldChange(m.id, 'note', e.target.value)}
            className={inp}
            placeholder="Interní poznámka (volitelné)"
          />
        </div>
      )}
    </div>
  )
}
