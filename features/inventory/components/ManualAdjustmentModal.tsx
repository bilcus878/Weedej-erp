'use client'

import { Edit2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface Props {
  adjustmentType:     'increase' | 'decrease'
  setAdjustmentType:  (t: 'increase' | 'decrease') => void
  adjustmentQuantity: string
  setAdjustmentQuantity: (v: string) => void
  adjustmentDate:     string
  setAdjustmentDate:  (v: string) => void
  adjustmentNote:     string
  setAdjustmentNote:  (v: string) => void
  onSubmit:           (e: React.FormEvent) => Promise<void>
  onClose:            () => void
}

export function ManualAdjustmentModal({
  adjustmentType, setAdjustmentType,
  adjustmentQuantity, setAdjustmentQuantity,
  adjustmentDate, setAdjustmentDate,
  adjustmentNote, setAdjustmentNote,
  onSubmit, onClose,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-5 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Edit2 className="w-7 h-7" />
              <div>
                <h2 className="text-2xl font-bold">Manko / Přebytek</h2>
                <p className="text-orange-100 text-sm mt-1">Manuální úprava skladu</p>
              </div>
            </div>
            <button onClick={onClose} className="text-orange-100 hover:text-white">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-6">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 border-l-4 border-purple-500">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Typ úpravy *</h3>
            <select value={adjustmentType} onChange={e => setAdjustmentType(e.target.value as 'increase' | 'decrease')} className="w-full border-2 border-purple-200 rounded-lg px-3 py-2 bg-white">
              <option value="increase">Přebytek (+)</option>
              <option value="decrease">Manko (-)</option>
            </select>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Detaily</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Množství *</label>
                <Input type="number" step="0.001" value={adjustmentQuantity} onChange={e => setAdjustmentQuantity(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Datum</label>
                <Input type="date" value={adjustmentDate} onChange={e => setAdjustmentDate(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-5 border-l-4 border-amber-500">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Poznámka</h3>
            <Input type="text" value={adjustmentNote} onChange={e => setAdjustmentNote(e.target.value)} placeholder="Důvod úpravy..." />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t-2 border-gray-200">
            <Button type="button" variant="secondary" onClick={onClose}>Zrušit</Button>
            <Button type="submit" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
              {adjustmentType === 'increase' ? 'Přidat přebytek' : 'Odebrat manko'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
