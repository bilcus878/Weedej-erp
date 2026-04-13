// Stránka pro správu kategorií (/categories)
// Přidat, upravit, smazat kategorie

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Plus, Edit2, Trash2, X } from 'lucide-react'

interface Category {
  id: string
  name: string
  _count?: {
    products: number
  }
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({ name: '' })

  useEffect(() => {
    fetchCategories()
  }, [])

  async function fetchCategories() {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Chyba při načítání kategorií:', error)
    } finally {
      setLoading(false)
    }
  }

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

    if (!formData.name.trim()) {
      alert('Vyplň název kategorie')
      return
    }

    try {
      if (editingCategory) {
        // Upravit existující kategorii
        const response = await fetch(`/api/categories/${editingCategory.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })

        if (response.ok) {
          alert('Kategorie upravena!')
        } else {
          const error = await response.json()
          alert(error.error || 'Nepodařilo se upravit kategorii')
          return
        }
      } else {
        // Přidat novou kategorii
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })

        if (response.ok) {
          alert('Kategorie přidána!')
        } else {
          const error = await response.json()
          alert(error.error || 'Nepodařilo se přidat kategorii')
          return
        }
      }

      await fetchCategories()
      handleCancel()
    } catch (error) {
      console.error('Chyba při ukládání kategorie:', error)
      alert('Nepodařilo se uložit kategorii')
    }
  }

  async function handleDelete(category: Category) {
    const productCount = category._count?.products || 0

    if (productCount > 0) {
      if (
        !confirm(
          `Kategorie "${category.name}" obsahuje ${productCount} produktů. Opravdu ji chceš smazat? Produkty zůstanou bez kategorie.`
        )
      ) {
        return
      }
    } else {
      if (!confirm(`Opravdu chceš smazat kategorii "${category.name}"?`)) {
        return
      }
    }

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Kategorie smazána!')
        await fetchCategories()
      } else {
        alert('Nepodařilo se smazat kategorii')
      }
    } catch (error) {
      console.error('Chyba při mazání kategorie:', error)
      alert('Nepodařilo se smazat kategorii')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Načítání...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hlavička */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kategorie</h1>
          <p className="text-gray-500 mt-1">
            Zobrazeno {categories.length} kategorií
          </p>
        </div>

        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Přidat kategorii
        </Button>
      </div>

      {/* Formulář */}
      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {editingCategory ? 'Upravit kategorii' : 'Nová kategorie'}
            </CardTitle>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Název kategorie *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  placeholder="např. CBD produkty"
                  required
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit">
                  {editingCategory ? 'Uložit změny' : 'Přidat kategorii'}
                </Button>
                <Button type="button" variant="secondary" onClick={handleCancel}>
                  Zrušit
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tabulka kategorií */}
      <Card>
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                Zatím nemáš žádné kategorie
              </p>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Přidat první kategorii
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Název</TableHead>
                  <TableHead>Počet produktů</TableHead>
                  <TableHead>Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
                    <TableCell>
                      {category._count?.products || 0}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Upravit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category)}
                          className="text-red-600 hover:text-red-800"
                          title="Smazat"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
