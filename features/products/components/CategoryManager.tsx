'use client'

import { useState } from 'react'
import { Edit2, Trash2, Tag } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { createCategory, updateCategory, deleteCategory } from '../services/productService'
import type { Category } from '../types'

interface Props {
  categories: Category[]
  onRefresh:  () => void
}

export function CategoryManager({ categories, onRefresh }: Props) {
  const [name,    setName]    = useState('')
  const [editing, setEditing] = useState<Category | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    if (editing) await updateCategory(editing.id, name)
    else         await createCategory(name)
    setName(''); setEditing(null); onRefresh()
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Smazat kategorii "${cat.name}"?${cat._count?.products ? ` (${cat._count.products} produktů bude bez kategorie)` : ''}`)) return
    await deleteCategory(cat.id)
    onRefresh()
  }

  return (
    <div className="border border-purple-200 rounded-lg overflow-hidden">
      <div className="bg-purple-50 px-4 py-2.5 border-b border-purple-200 flex items-center gap-2">
        <Tag className="w-3.5 h-3.5 text-purple-600" />
        <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Správa kategorií</span>
      </div>
      <div className="p-3 space-y-2 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Název kategorie..." className="flex-1 h-8 text-xs" required />
          <Button type="submit" size="sm" className="h-8 text-xs px-3 bg-purple-600 hover:bg-purple-700 text-white">{editing ? 'Uložit' : 'Přidat'}</Button>
          {editing && <Button type="button" size="sm" variant="secondary" className="h-8 text-xs px-2" onClick={() => { setEditing(null); setName('') }}>✕</Button>}
        </form>
        <div className="max-h-44 overflow-y-auto space-y-1">
          {categories.length === 0
            ? <p className="text-xs text-gray-400 text-center py-3">Žádné kategorie.</p>
            : categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded-md border border-gray-100 hover:bg-gray-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-gray-900 truncate">{cat.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 shrink-0">{cat._count?.products ?? 0}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditing(cat); setName(cat.name) }} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Upravit"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(cat)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Smazat"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  )
}
