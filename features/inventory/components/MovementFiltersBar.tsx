'use client'

import type { RefObject } from 'react'

interface Props {
  filterDate:            string
  setFilterDate:         (v: string) => void
  filterType:            string
  setFilterType:         (v: string) => void
  filterTypeDropdownOpen: boolean
  setFilterTypeDropdownOpen: (v: boolean) => void
  filterTypeRef:         RefObject<HTMLDivElement>
  filterMinQuantity:     string
  setFilterMinQuantity:  (v: string) => void
  filterNote:            string
  setFilterNote:         (v: string) => void
  onClear:               () => void
}

export function MovementFiltersBar({
  filterDate, setFilterDate,
  filterType, setFilterType,
  filterTypeDropdownOpen, setFilterTypeDropdownOpen, filterTypeRef,
  filterMinQuantity, setFilterMinQuantity,
  filterNote, setFilterNote,
  onClear,
}: Props) {
  return (
    <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
      <button onClick={onClear} className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs rounded flex items-center justify-center" title="Vymazat filtry">✕</button>
      <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-purple-500" />
      <div ref={filterTypeRef} className="relative">
        <div onClick={() => setFilterTypeDropdownOpen(!filterTypeDropdownOpen)} className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center cursor-pointer bg-white hover:border-purple-500">
          {filterType === 'all' && 'Vše'}
          {filterType === 'in'  && <span className="text-green-600">Příjem (+)</span>}
          {filterType === 'out' && <span className="text-red-600">Výdej (-)</span>}
        </div>
        {filterTypeDropdownOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg">
            <div onClick={() => { setFilterType('all');  setFilterTypeDropdownOpen(false) }} className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-xs text-center">Vše</div>
            <div onClick={() => { setFilterType('in');   setFilterTypeDropdownOpen(false) }} className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-xs text-center text-green-600">Příjem (+)</div>
            <div onClick={() => { setFilterType('out');  setFilterTypeDropdownOpen(false) }} className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-xs text-center text-red-600">Výdej (-)</div>
          </div>
        )}
      </div>
      <input type="number" value={filterMinQuantity} onChange={e => setFilterMinQuantity(e.target.value)} placeholder="Min. množství" className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-purple-500" />
      <input type="text"   value={filterNote}        onChange={e => setFilterNote(e.target.value)}        placeholder="Poznámka..."   className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-purple-500" />
    </div>
  )
}
