'use client'

import { useState } from 'react'
import { Tag, Plus, Edit2, Trash2, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import {
  useEntityPage, EntityPage, LoadingState, ErrorState,
} from '@/components/erp'

export const dynamic = 'force-dynamic'

interface Category {
  id: string
  name: string
  _count?: { products: number }
}

export default function CategoriesPage() {
  const ep = useEntityPage<Category>({
    fetchData: async () => {
      const res = await fetch('/api/categories')
      return res.json()
    },
    getRowId: r => r.id,
    filterFn: () => true,
    highlightId: null,
  })

  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({ name: '' })

  function handleAdd() {
    setEditingCategory(null)
    setFormData({ name: '' })
    setShowForm(true)
  }

  function handleEdit(category: Category) {
    setEditingCategory(category)
    setFormData({ name: category.name })
    setShowForm(true)
  }

  function handleCancel() {
    setShowForm(false)
    setEditingCategory(null)
    setFormData({ name: '' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim()) { alert('Vyplň název kategorie'); return }
    try {
      if (editingCategory) {
        const res = await fetch(`/api/categories/${editingCategory.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        const body = await res.json()
        if (!res.ok) { alert(body.error || 'Nepodařilo se upravit kategorii'); return }
        alert('Kategorie upravena!')
      } else {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        const body = await res.json()
        if (!res.ok) { alert(body.error || 'Nepodařilo se přidat kategorii'); return }
        alert('Kategorie přidána!')
      }
      await ep.refresh()
      handleCancel()
    } catch {
      alert('Nepodařilo se uložit kategorii')
    }
  }

  async function handleDelete(category: Category) {
    const productCount = category._count?.products || 0
    const msg = productCount > 0
      ? `Kategorie "${category.name}" obsahuje ${productCount} produktů. Opravdu ji chceš smazat? Produkty zůstanou bez kategorie.`
      : `Opravdu chceš smazat kategorii "${category.name}"?`
    if (!confirm(msg)) return
    try {
      const res = await fetch(`/api/categories/${category.id}`, { method: 'DELETE' })
      if (res.ok) { alert('Kategorie smazána!'); await ep.refresh() }
      else alert('Nepodařilo se smazat kategorii')
    } catch {
      alert('Nepodařilo se smazat kategorii')
    }
  }

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <EntityPage highlightId={null}>
      <EntityPage.Header
        title="Kategorie"
        icon={Tag}
        color="gray"
        total={ep.rows.length}
        filtered={ep.rows.length}
        onRefresh={ep.refresh}
        actions={
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Přidat kategorii
          </button>
        }
      />

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editingCategory ? 'Upravit kategorii' : 'Nová kategorie'}</CardTitle>
            <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Název kategorie *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  placeholder="např. CBD produkty"
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit">{editingCategory ? 'Uložit změny' : 'Přidat kategorii'}</Button>
                <Button type="button" variant="secondary" onClick={handleCancel}>Zrušit</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {ep.rows.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Zatím nemáš žádné kategorie</p>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Přidat první kategorii
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Název</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Počet produktů</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Akce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ep.rows.map(category => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{category.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{category._count?.products || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(category)} className="text-blue-600 hover:text-blue-800" title="Upravit">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(category)} className="text-red-600 hover:text-red-800" title="Smazat">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </EntityPage>
  )
}
