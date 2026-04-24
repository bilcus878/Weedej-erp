'use client'

import type { RefObject } from 'react'
import type { Category } from '../types'

interface Props {
  categories:                  Category[]
  filterName:                  string
  setFilterName:               (v: string) => void
  filterCategory:              string
  setFilterCategory:           (v: string) => void
  filterCategoryDropdownOpen:  boolean
  setFilterCategoryDropdownOpen: (v: boolean) => void
  filterCategoryRef:           RefObject<HTMLDivElement>
  filterMinStock:              string
  setFilterMinStock:           (v: string) => void
  filterMinReserved:           string
  setFilterMinReserved:        (v: string) => void
  filterMinAvailable:          string
  setFilterMinAvailable:       (v: string) => void
  filterMinExpected:           string
  setFilterMinExpected:        (v: string) => void
  filterStatus:                string
  setFilterStatus:             (v: string) => void
  filterStatusDropdownOpen:    boolean
  setFilterStatusDropdownOpen: (v: boolean) => void
  filterStatusRef:             RefObject<HTMLDivElement>
  onClear:                     () => void
}

export function InventoryFiltersBar({
  categories,
  filterName, setFilterName,
  filterCategory, setFilterCategory,
  filterCategoryDropdownOpen, setFilterCategoryDropdownOpen, filterCategoryRef,
  filterMinStock, setFilterMinStock,
  filterMinReserved, setFilterMinReserved,
  filterMinAvailable, setFilterMinAvailable,
  filterMinExpected, setFilterMinExpected,
  filterStatus, setFilterStatus,
  filterStatusDropdownOpen, setFilterStatusDropdownOpen, filterStatusRef,
  onClear,
}: Props) {
  return (
    <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
      <button onClick={onClear} className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs rounded flex items-center justify-center" title="Vymazat filtry">✕</button>
      <input type="text" value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Produkt..." className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-purple-500" />
      <div ref={filterCategoryRef} className="relative">
        <div onClick={() => setFilterCategoryDropdownOpen(!filterCategoryDropdownOpen)} className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center cursor-pointer bg-white hover:border-purple-500 truncate">
          {filterCategory ? categories.find(c => c.id === filterCategory)?.name || 'Kategorie' : 'Kategorie'}
        </div>
        {filterCategoryDropdownOpen && (
          <div className="absolute z-50 mt-1 w-40 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
            <div onClick={() => { setFilterCategory(''); setFilterCategoryDropdownOpen(false) }} className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-xs">Vše</div>
            {categories.map(cat => (
              <div key={cat.id} onClick={() => { setFilterCategory(cat.id); setFilterCategoryDropdownOpen(false) }} className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-xs truncate">{cat.name}</div>
            ))}
          </div>
        )}
      </div>
      <input type="number" value={filterMinStock}     onChange={e => setFilterMinStock(e.target.value)}     placeholder="≥ Skladem"  className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-purple-500" />
      <input type="number" value={filterMinReserved}  onChange={e => setFilterMinReserved(e.target.value)}  placeholder="≥ Rezerv."  className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-purple-500" />
      <input type="number" value={filterMinAvailable} onChange={e => setFilterMinAvailable(e.target.value)} placeholder="≥ Dostup."  className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-purple-500" />
      <input type="number" value={filterMinExpected}  onChange={e => setFilterMinExpected(e.target.value)}  placeholder="≥ Očekáv."  className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-purple-500" />
      <div ref={filterStatusRef} className="relative">
        <div onClick={() => setFilterStatusDropdownOpen(!filterStatusDropdownOpen)} className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center cursor-pointer bg-white hover:border-purple-500">
          {filterStatus === 'all'   && 'Status'}
          {filterStatus === 'ok'    && <span className="text-green-600">OK</span>}
          {filterStatus === 'low'   && <span className="text-orange-600">Nízký</span>}
          {filterStatus === 'empty' && <span className="text-red-600">Vyprodáno</span>}
        </div>
        {filterStatusDropdownOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg">
            <div onClick={() => { setFilterStatus('all');   setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-xs text-center">Vše</div>
            <div onClick={() => { setFilterStatus('ok');    setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-xs text-center text-green-600">OK</div>
            <div onClick={() => { setFilterStatus('low');   setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-xs text-center text-orange-600">Nízký stav</div>
            <div onClick={() => { setFilterStatus('empty'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-xs text-center text-red-600">Vyprodáno</div>
          </div>
        )}
      </div>
    </div>
  )
}
