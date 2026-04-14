// Stránka katalogu zboží (/products)
// Moderní layout s rozbalovacími řádky, filtry a správou kategorií

'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { formatPrice, formatQuantity } from '@/lib/utils'
import { VAT_RATE_LABELS, calculateVatFromNet, isNonVatPayer, CZECH_VAT_RATES } from '@/lib/vatCalculation'
import { Plus, X, Edit2, Trash2, ChevronUp, ChevronDown, ChevronRight, FolderOpen, Package, Tag, ShoppingBag } from 'lucide-react'

interface Product {
  id: string
  name: string
  price: number | string
  purchasePrice?: number | string | null
  vatRate: number | string
  unit: string
  categoryId?: string | null
  category?: {
    id: string
    name: string
  } | null
  stockQuantity: number
}

interface Category {
  id: string
  name: string
  _count?: {
    products: number
  }
}

interface EshopVariant {
  id: string
  productId: string
  name: string
  price: number | string
  variantValue?: number | null  // Množství na variantu (100, 30, 3.5 …)
  variantUnit?: string | null   // Jednotka: "g" | "ml" | "ks"
  isDefault: boolean
  isActive: boolean
}

interface EshopVariantForm {
  name: string
  price: string
  variantValue: string
  variantUnit: 'g' | 'ml' | 'ks' | ''
  isDefault: boolean
  isActive: boolean
}

type SortField = 'name' | 'category' | 'price' | 'purchasePrice'
type SortDirection = 'asc' | 'desc'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [isVatPayer, setIsVatPayer] = useState<boolean>(true)
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  // Eshop Variants state (per productId)
  const [eshopVariants, setEshopVariants] = useState<Record<string, EshopVariant[]>>({})
  const [variantForms, setVariantForms] = useState<Record<string, EshopVariantForm>>({})
  const [editingVariant, setEditingVariant] = useState<Record<string, EshopVariant | null>>({})
  const [variantLoading, setVariantLoading] = useState<Record<string, boolean>>({})

  // Category management state
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [categoryFormData, setCategoryFormData] = useState({ name: '' })
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  // Filtry
  const [filterName, setFilterName] = useState('')
  const [filterPriceMin, setFilterPriceMin] = useState('')
  const [filterPriceMax, setFilterPriceMax] = useState('')
  const [filterVat, setFilterVat] = useState('')
  const [filterPurchasePriceMin, setFilterPurchasePriceMin] = useState('')
  const [filterPurchasePriceMax, setFilterPurchasePriceMax] = useState('')
  const [filterUnit, setFilterUnit] = useState('')

  // Paginace
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const sectionRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    purchasePrice: '',
    vatRate: '21',
    unit: 'ks',
    categoryId: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [productsRes, categoriesRes, settingsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
        fetch('/api/settings'),
      ])
      const productsData = await productsRes.json()
      const categoriesData = await categoriesRes.json()
      const settingsData = await settingsRes.json()
      setProducts(productsData)
      setCategories(categoriesData)
      setIsVatPayer(settingsData.isVatPayer ?? true)
    } catch (error) {
      console.error('Chyba při načítání dat:', error)
    } finally {
      setLoading(false)
    }
  }

  // Otevřít formulář pro přidání
  function handleAdd() {
    setEditingProduct(null)
    const defaultVatRate = isVatPayer ? '21' : '0'
    setFormData({ name: '', price: '', purchasePrice: '', vatRate: defaultVatRate, unit: 'ks', categoryId: '' })
    setShowForm(true)
  }

  // Otevřít formulář pro úpravu
  function handleEdit(product: Product) {
    setEditingProduct(product)
    const productVatRate = isVatPayer ? (product.vatRate?.toString() || '21') : '0'
    setFormData({
      name: product.name,
      price: product.price.toString(),
      purchasePrice: product.purchasePrice ? product.purchasePrice.toString() : '',
      vatRate: productVatRate,
      unit: product.unit,
      categoryId: product.categoryId || '',
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Zrušit formulář
  function handleCancel() {
    setShowForm(false)
    setEditingProduct(null)
    const defaultVatRate = isVatPayer ? '21' : '0'
    setFormData({ name: '', price: '', purchasePrice: '', vatRate: defaultVatRate, unit: 'ks', categoryId: '' })
  }

  // Odeslat formulář (přidat nebo upravit)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.name || !formData.price) {
      alert('Vyplň název a cenu')
      return
    }

    const finalVatRate = isVatPayer ? parseFloat(formData.vatRate) : 0

    try {
      if (editingProduct) {
        const response = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            price: parseFloat(formData.price),
            purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
            vatRate: finalVatRate,
            unit: formData.unit,
            categoryId: formData.categoryId || null,
          }),
        })

        if (response.ok) {
          alert('Produkt upraven!')
        } else {
          alert('Chyba při úpravě produktu')
          return
        }
      } else {
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            price: parseFloat(formData.price),
            purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
            vatRate: finalVatRate,
            unit: formData.unit,
            categoryId: formData.categoryId || null,
          }),
        })

        if (response.ok) {
          alert('Produkt přidán')
        } else {
          alert('Chyba při přidávání produktu')
          return
        }
      }

      await fetchData()
      handleCancel()
    } catch (error) {
      console.error('Chyba při ukládání produktu:', error)
      alert('Chyba při ukládání produktu')
    }
  }

  // Smazat jeden produkt
  async function handleDelete(product: Product) {
    if (!confirm(`Opravdu chceš smazat produkt "${product.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Produkt smazán!')
        await fetchData()
      } else {
        alert('Nepodařilo se smazat produkt')
      }
    } catch (error) {
      console.error('Chyba při mazání produktu:', error)
      alert('Nepodařilo se smazat produkt')
    }
  }

  // Hromadné mazání
  async function handleBulkDelete() {
    if (selectedProducts.size === 0) {
      alert('Nevybral jsi žádné produkty')
      return
    }

    if (
      !confirm(
        `Opravdu chceš smazat ${selectedProducts.size} vybraných produktů?`
      )
    ) {
      return
    }

    try {
      const response = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedProducts) }),
      })

      if (response.ok) {
        alert(`Smazáno ${selectedProducts.size} produktů!`)
        setSelectedProducts(new Set())
        await fetchData()
      } else {
        alert('Nepodařilo se smazat produkty')
      }
    } catch (error) {
      console.error('Chyba při mazání produktů:', error)
      alert('Nepodařilo se smazat produkty')
    }
  }

  // Toggle výběr produktu
  function toggleProductSelection(productId: string) {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  // Toggle expand
  function toggleExpand(productId: string) {
    const newExpanded = new Set(expandedProducts)
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId)
    } else {
      newExpanded.add(productId)
    }
    setExpandedProducts(newExpanded)
  }

  // Řazení
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Filtrované a seřazené produkty
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products

    // Filtr podle kategorie (dropdown)
    if (categoryFilter) {
      filtered = filtered.filter(p => p.categoryId === categoryFilter)
    }

    // Textové filtry
    if (filterName) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(filterName.toLowerCase())
      )
    }
    if (filterUnit) {
      filtered = filtered.filter(p =>
        p.unit.toLowerCase().includes(filterUnit.toLowerCase())
      )
    }

    // Cenové filtry - prodejní cena
    if (filterPriceMin) {
      const min = parseFloat(filterPriceMin)
      if (!isNaN(min)) filtered = filtered.filter(p => Number(p.price) >= min)
    }
    if (filterPriceMax) {
      const max = parseFloat(filterPriceMax)
      if (!isNaN(max)) filtered = filtered.filter(p => Number(p.price) <= max)
    }

    // Filtr DPH
    if (filterVat) {
      filtered = filtered.filter(p => String(Number(p.vatRate)) === filterVat)
    }

    // Cenové filtry - nákupní cena
    if (filterPurchasePriceMin) {
      const min = parseFloat(filterPurchasePriceMin)
      if (!isNaN(min)) filtered = filtered.filter(p => Number(p.purchasePrice || 0) >= min)
    }
    if (filterPurchasePriceMax) {
      const max = parseFloat(filterPurchasePriceMax)
      if (!isNaN(max)) filtered = filtered.filter(p => Number(p.purchasePrice || 0) <= max)
    }

    // Pak seřaď
    return [...filtered].sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === 'category') {
        aVal = a.category?.name || ''
        bVal = b.category?.name || ''
      }

      if (sortField === 'purchasePrice') {
        aVal = a.purchasePrice || 0
        bVal = b.purchasePrice || 0
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [products, sortField, sortDirection, categoryFilter, filterName, filterUnit, filterPriceMin, filterPriceMax, filterVat, filterPurchasePriceMin, filterPurchasePriceMax])

  // Reset stránky při změně filtrů
  useEffect(() => {
    setCurrentPage(1)
  }, [filterName, filterUnit, categoryFilter, filterPriceMin, filterPriceMax, filterVat, filterPurchasePriceMin, filterPurchasePriceMax])

  // Paginované produkty
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredAndSortedProducts.slice(start, start + itemsPerPage)
  }, [filteredAndSortedProducts, currentPage, itemsPerPage])

  // Vybrat všechny / zrušit výběr
  function toggleSelectAll() {
    if (selectedProducts.size === filteredAndSortedProducts.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(filteredAndSortedProducts.map(p => p.id)))
    }
  }

  // Ikona pro řazení
  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 inline ml-1 opacity-0" />
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3 inline ml-1 text-blue-600" />
    ) : (
      <ChevronDown className="h-3 w-3 inline ml-1 text-blue-600" />
    )
  }

  // Category management functions
  async function handleCategorySubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!categoryFormData.name.trim()) {
      alert('Vyplň název kategorie')
      return
    }

    try {
      if (editingCategory) {
        const response = await fetch(`/api/categories/${editingCategory.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: categoryFormData.name }),
        })

        if (response.ok) {
          alert('Kategorie upravena!')
        } else {
          alert('Chyba při úpravě kategorie')
          return
        }
      } else {
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: categoryFormData.name }),
        })

        if (response.ok) {
          alert('Kategorie přidána!')
        } else {
          alert('Chyba při přidávání kategorie')
          return
        }
      }

      setCategoryFormData({ name: '' })
      setEditingCategory(null)
      await fetchData()
    } catch (error) {
      console.error('Chyba při ukládání kategorie:', error)
      alert('Chyba při ukládání kategorie')
    }
  }

  async function handleCategoryDelete(category: Category) {
    if (
      !confirm(
        `Opravdu chceš smazat kategorii "${category.name}"? ${
          category._count?.products
            ? `Kategorie má ${category._count.products} produktů - budou přesunuty do "Bez kategorie".`
            : ''
        }`
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Kategorie smazána!')
        await fetchData()
      } else {
        alert('Nepodařilo se smazat kategorii')
      }
    } catch (error) {
      console.error('Chyba při mazání kategorie:', error)
      alert('Nepodařilo se smazat kategorii')
    }
  }

  function handleCategoryEdit(category: Category) {
    setEditingCategory(category)
    setCategoryFormData({ name: category.name })
  }

  function handleCategoryCancelEdit() {
    setEditingCategory(null)
    setCategoryFormData({ name: '' })
  }

  // ─── Eshop Variants ────────────────────────────────────────────────────────

  const emptyVariantForm = (): EshopVariantForm => ({
    name: '', price: '', variantValue: '', variantUnit: '', isDefault: false, isActive: true,
  })

  async function fetchEshopVariants(productId: string) {
    try {
      const res = await fetch(`/api/products/${productId}/eshop-variants`)
      if (res.ok) {
        const data = await res.json()
        setEshopVariants((prev) => ({ ...prev, [productId]: data }))
      }
    } catch { /* ignore */ }
  }

  function handleToggleExpand(productId: string) {
    toggleExpand(productId)
    // Načti varianty při prvním rozbalení
    if (!eshopVariants[productId]) {
      fetchEshopVariants(productId)
    }
  }

  async function handleVariantSubmit(productId: string) {
    const form = variantForms[productId] || emptyVariantForm()
    if (!form.name || !form.price) {
      alert('Vyplň název a cenu varianty')
      return
    }
    setVariantLoading((prev) => ({ ...prev, [productId]: true }))
    try {
      const editing = editingVariant[productId]
      const url = editing
        ? `/api/products/${productId}/eshop-variants/${editing.id}`
        : `/api/products/${productId}/eshop-variants`
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          price: parseFloat(form.price),
          variantValue: form.variantValue ? parseFloat(form.variantValue) : null,
          variantUnit: form.variantUnit || null,
          isDefault: form.isDefault,
          isActive: form.isActive,
        }),
      })
      if (!res.ok) throw new Error('Chyba při ukládání varianty')
      await fetchEshopVariants(productId)
      setVariantForms((prev) => ({ ...prev, [productId]: emptyVariantForm() }))
      setEditingVariant((prev) => ({ ...prev, [productId]: null }))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setVariantLoading((prev) => ({ ...prev, [productId]: false }))
    }
  }

  function handleEditVariant(productId: string, variant: EshopVariant) {
    setEditingVariant((prev) => ({ ...prev, [productId]: variant }))
    setVariantForms((prev) => ({
      ...prev,
      [productId]: {
        name: variant.name,
        price: String(variant.price),
        variantValue: variant.variantValue ? String(variant.variantValue) : '',
        variantUnit: (variant.variantUnit as 'g' | 'ml' | 'ks' | '') ?? '',
        isDefault: variant.isDefault,
        isActive: variant.isActive,
      },
    }))
  }

  function handleCancelVariantEdit(productId: string) {
    setEditingVariant((prev) => ({ ...prev, [productId]: null }))
    setVariantForms((prev) => ({ ...prev, [productId]: emptyVariantForm() }))
  }

  async function handleDeleteVariant(productId: string, variantId: string, variantName: string) {
    if (!confirm(`Smazat variantu "${variantName}"?`)) return
    setVariantLoading((prev) => ({ ...prev, [productId]: true }))
    try {
      const res = await fetch(`/api/products/${productId}/eshop-variants/${variantId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Chyba při mazání varianty')
      await fetchEshopVariants(productId)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setVariantLoading((prev) => ({ ...prev, [productId]: false }))
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    setTimeout(() => {
      if (sectionRef.current) {
        sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 50)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Načítání...</p>
      </div>
    )
  }

  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage)

  return (
    <div className="space-y-6">
      {/* Hlavička */}
      <div className="bg-gradient-to-r from-slate-50 to-orange-50 border-l-4 border-orange-500 rounded-lg shadow-sm py-4 px-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1" />
          <h1 className="text-2xl font-bold text-orange-600">
            Katalog zboží
            <span className="text-sm font-normal text-gray-600 ml-3">
              (Zobrazeno <span className="font-semibold text-orange-600">{filteredAndSortedProducts.length}</span> z <span className="font-semibold text-gray-700">{products.length}</span>)
            </span>
          </h1>
          <div className="flex-1 flex justify-end gap-2">
            {selectedProducts.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Smazat vybrané ({selectedProducts.size})
              </button>
            )}
            <button
              onClick={() => setShowCategoryManager(!showCategoryManager)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-purple-600 text-white hover:bg-purple-700"
            >
              <Tag className="h-4 w-4" />
              Správa kategorií
              {categories.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-purple-500 text-white">
                  {categories.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Category Manager - collapsible */}
      {showCategoryManager && (
        <Card className="border-2 border-purple-300 bg-purple-50 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-purple-900 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Správa kategorií
              </CardTitle>
              <button
                onClick={() => {
                  setShowCategoryManager(false)
                  handleCategoryCancelEdit()
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 bg-white rounded-b-lg">
            {/* Category Form */}
            <form onSubmit={handleCategorySubmit} className="flex gap-3">
              <div className="flex-1">
                <Input
                  value={categoryFormData.name}
                  onChange={(e) =>
                    setCategoryFormData({ name: e.target.value })
                  }
                  placeholder="Název kategorie"
                  required
                />
              </div>
              <Button type="submit">
                {editingCategory ? 'Uložit' : 'Přidat kategorii'}
              </Button>
              {editingCategory && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCategoryCancelEdit}
                >
                  Zrušit
                </Button>
              )}
            </form>

            {/* Category List */}
            <div className="space-y-1">
              {categories.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  Žádné kategorie
                </div>
              ) : (
                categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm text-gray-900">{category.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {category._count?.products || 0} produktů
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCategoryEdit(category)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Upravit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleCategoryDelete(category)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Smazat"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulář pro přidání/úpravu produktu - collapsible card */}
      <Card className="border-2 border-orange-300 bg-orange-50 shadow-lg">
        <CardHeader
          className="cursor-pointer hover:bg-orange-100 transition-colors"
          onClick={() => {
            if (!showForm) {
              handleAdd()
            } else if (!editingProduct) {
              setShowForm(false)
            }
          }}
        >
          <div className="flex items-center gap-2">
            {showForm ? (
              <ChevronDown className="h-6 w-6 text-orange-600" />
            ) : (
              <ChevronRight className="h-6 w-6 text-orange-600" />
            )}
            <CardTitle className="text-orange-900 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {editingProduct ? 'Upravit produkt' : 'Nový produkt'}
            </CardTitle>
          </div>
        </CardHeader>

        {showForm && (
          <CardContent className="p-6 bg-white">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sekce: Základní údaje */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-5 border-l-4 border-orange-500 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-600" />
                  Základní údaje
                  <span className="text-red-500 text-sm">*</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Název produktu *
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="např. White Truffle (X2)"
                      className="bg-white border-orange-200 focus:border-orange-400 focus:ring-orange-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kategorie
                    </label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) =>
                        setFormData({ ...formData, categoryId: e.target.value })
                      }
                      className="w-full h-10 rounded-md border border-orange-200 bg-white px-3 focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    >
                      <option value="">Bez kategorie</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jednotka *
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) =>
                        setFormData({ ...formData, unit: e.target.value })
                      }
                      className="w-full h-10 rounded-md border border-orange-200 bg-white px-3 focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    >
                      <option value="ks">ks (kusy)</option>
                      <option value="g">g (gramy)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sazba DPH *
                    </label>
                    {isVatPayer ? (
                      <select
                        value={formData.vatRate}
                        onChange={(e) =>
                          setFormData({ ...formData, vatRate: e.target.value })
                        }
                        className="w-full h-10 rounded-md border border-orange-200 bg-white px-3 focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                      >
                        {CZECH_VAT_RATES.map((rate) => (
                          <option key={rate} value={rate}>
                            {VAT_RATE_LABELS[rate]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full h-10 rounded-md border border-gray-200 bg-gray-100 px-3 flex items-center text-gray-600">
                        Neplátce DPH
                      </div>
                    )}
                    {!isVatPayer && (
                      <p className="text-xs text-gray-500 mt-1">
                        Firma není plátce DPH - změnit lze v Nastavení
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sekce: Ceny */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border-l-4 border-green-500 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Ceny
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prodejní cena (Kč) *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      placeholder="např. 140"
                      className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nákupní cena (Kč)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.purchasePrice}
                      onChange={(e) =>
                        setFormData({ ...formData, purchasePrice: e.target.value })
                      }
                      placeholder="např. 90"
                      className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400"
                    />
                  </div>
                </div>

                {/* Náhled cen - POUZE PRO PLÁTCE DPH */}
                {formData.price && isVatPayer && (
                  <div className="mt-4 bg-white rounded-lg p-3 text-sm text-gray-600 border border-green-200">
                    <span className="font-medium">Náhled: </span>
                    Prodejní cena bez DPH: {formatPrice(parseFloat(formData.price))}
                    {' → '}
                    s DPH ({VAT_RATE_LABELS[parseFloat(formData.vatRate)]}): {formatPrice(calculateVatFromNet(parseFloat(formData.price), parseFloat(formData.vatRate)).priceWithVat)}
                    {formData.purchasePrice && (
                      <>
                        {' | '}
                        Nákupní bez DPH: {formatPrice(parseFloat(formData.purchasePrice))}
                        {' → '}
                        s DPH: {formatPrice(calculateVatFromNet(parseFloat(formData.purchasePrice), parseFloat(formData.vatRate)).priceWithVat)}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                >
                  Zrušit
                </Button>
                <Button type="submit">
                  {editingProduct ? 'Uložit změny' : 'Přidat produkt'}
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Seznam produktů */}
      <div ref={sectionRef} className="space-y-2">
        {products.length === 0 ? (
          <div className="border rounded-lg p-12 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">
              Žádné produkty v katalogu.
            </p>
            <p className="text-sm text-gray-400">Klikni na oranžový panel nahoře pro přidání prvního produktu</p>
          </div>
        ) : (
          <>
            {/* Filtrační řádek */}
            <div className={`grid items-center gap-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg ${
              isVatPayer
                ? 'grid-cols-[32px_20px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]'
                : 'grid-cols-[32px_20px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]'
            }`}>
              <button
                onClick={() => {
                  setFilterName('')
                  setCategoryFilter('')
                  setFilterPriceMin('')
                  setFilterPriceMax('')
                  setFilterVat('')
                  setFilterPurchasePriceMin('')
                  setFilterPurchasePriceMax('')
                  setFilterUnit('')
                }}
                className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs rounded transition-colors flex items-center justify-center"
                title="Vymazat filtry"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* Checkbox select all */}
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={selectedProducts.size === filteredAndSortedProducts.length && filteredAndSortedProducts.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded"
                />
              </div>

              {/* Název - text */}
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Název..."
                className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center placeholder:text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />

              {/* Kategorie - dropdown */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-1 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Vše</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>

              {/* Prodejní cena - rozsah */}
              <div className="flex gap-1">
                <input
                  type="number"
                  value={filterPriceMin}
                  onChange={(e) => setFilterPriceMin(e.target.value)}
                  placeholder="Od"
                  className="w-1/2 px-1 py-1.5 border border-gray-300 rounded text-xs text-center placeholder:text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  value={filterPriceMax}
                  onChange={(e) => setFilterPriceMax(e.target.value)}
                  placeholder="Do"
                  className="w-1/2 px-1 py-1.5 border border-gray-300 rounded text-xs text-center placeholder:text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* DPH - dropdown */}
              {isVatPayer && (
                <select
                  value={filterVat}
                  onChange={(e) => setFilterVat(e.target.value)}
                  className="px-1 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Vše</option>
                  {CZECH_VAT_RATES.map((rate) => (
                    <option key={rate} value={String(rate)}>{VAT_RATE_LABELS[rate]}</option>
                  ))}
                </select>
              )}

              {/* Nákupní cena - rozsah */}
              <div className="flex gap-1">
                <input
                  type="number"
                  value={filterPurchasePriceMin}
                  onChange={(e) => setFilterPurchasePriceMin(e.target.value)}
                  placeholder="Od"
                  className="w-1/2 px-1 py-1.5 border border-gray-300 rounded text-xs text-center placeholder:text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="number"
                  value={filterPurchasePriceMax}
                  onChange={(e) => setFilterPurchasePriceMax(e.target.value)}
                  placeholder="Do"
                  className="w-1/2 px-1 py-1.5 border border-gray-300 rounded text-xs text-center placeholder:text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Jednotka - text */}
              <input
                type="text"
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                placeholder="Jednotka..."
                className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center placeholder:text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Hlavička tabulky */}
            <div className={`grid items-center gap-4 px-4 py-3 bg-gray-100 border rounded-lg text-xs font-semibold text-gray-700 ${
              isVatPayer
                ? 'grid-cols-[32px_20px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]'
                : 'grid-cols-[32px_20px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]'
            }`}>
              <div></div>
              <div></div>
              <div
                className="text-center cursor-pointer hover:text-blue-600 transition-colors select-none"
                onClick={() => handleSort('name')}
              >
                Název <SortIcon field="name" />
              </div>
              <div
                className="text-center cursor-pointer hover:text-blue-600 transition-colors select-none"
                onClick={() => handleSort('category')}
              >
                Kategorie <SortIcon field="category" />
              </div>
              <div
                className="text-center cursor-pointer hover:text-blue-600 transition-colors select-none"
                onClick={() => handleSort('price')}
              >
                Prodejní cena <SortIcon field="price" />
              </div>
              {isVatPayer && (
                <div className="text-center">
                  DPH
                </div>
              )}
              <div
                className="text-center cursor-pointer hover:text-blue-600 transition-colors select-none"
                onClick={() => handleSort('purchasePrice')}
              >
                Nákupní cena <SortIcon field="purchasePrice" />
              </div>
              <div className="text-center">Jednotka</div>
            </div>

            {/* Produkty - expandable rows */}
            {paginatedProducts.map((product) => {
              const isExpanded = expandedProducts.has(product.id)

              return (
                <div
                  key={product.id}
                  className={`border rounded-lg transition-all ${
                    isExpanded ? 'ring-2 ring-orange-400 shadow-md' : 'hover:shadow-sm'
                  }`}
                >
                  {/* Hlavní řádek */}
                  <div className={`grid items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50 ${
                    isVatPayer
                      ? 'grid-cols-[32px_20px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]'
                      : 'grid-cols-[32px_20px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]'
                  }`}>
                    {/* Rozbalit/sbalit */}
                    <button
                      onClick={() => handleToggleExpand(product.id)}
                      className="flex items-center justify-center"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </button>

                    {/* Checkbox */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                        className="rounded"
                      />
                    </div>

                    {/* Název */}
                    <div
                      className="cursor-pointer text-center overflow-hidden"
                      onClick={() => handleToggleExpand(product.id)}
                    >
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {product.name}
                      </p>
                    </div>

                    {/* Kategorie */}
                    <div
                      className="cursor-pointer text-center overflow-hidden"
                      onClick={() => handleToggleExpand(product.id)}
                    >
                      {product.category?.name ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 truncate inline-block max-w-full">
                          {product.category.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </div>

                    {/* Prodejní cena */}
                    <div
                      className="cursor-pointer text-center overflow-hidden"
                      onClick={() => handleToggleExpand(product.id)}
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">{formatPrice(product.price)}</p>
                    </div>

                    {/* DPH */}
                    {isVatPayer && (
                      <div
                        className="cursor-pointer text-center overflow-hidden"
                        onClick={() => handleToggleExpand(product.id)}
                      >
                        <p className="text-xs text-gray-500 truncate">
                          {isNonVatPayer(Number(product.vatRate))
                            ? '-'
                            : (VAT_RATE_LABELS[Number(product.vatRate)] || `${Number(product.vatRate)}%`)
                          }
                        </p>
                      </div>
                    )}

                    {/* Nákupní cena */}
                    <div
                      className="cursor-pointer text-center overflow-hidden"
                      onClick={() => handleToggleExpand(product.id)}
                    >
                      <p className="text-sm text-gray-600 truncate">
                        {product.purchasePrice ? formatPrice(product.purchasePrice) : '-'}
                      </p>
                    </div>

                    {/* Jednotka */}
                    <div
                      className="cursor-pointer text-center overflow-hidden"
                      onClick={() => handleToggleExpand(product.id)}
                    >
                      <p className="text-xs text-gray-500 truncate">{product.unit}</p>
                    </div>
                  </div>

                  {/* Rozbalený detail */}
                  {isExpanded && (
                    <div className="border-t p-4 bg-gray-50">
                      <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                        <h4 className="font-semibold px-4 py-3 bg-gray-100 border-b text-sm">Detail produktu</h4>
                        <div className="text-sm">
                          {/* Název a Kategorie */}
                          <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                            <div><span className="text-gray-600">Název:</span> <span className="font-medium">{product.name}</span></div>
                            <div className="border-l border-gray-200 mx-4"></div>
                            <div><span className="text-gray-600">Kategorie:</span> <span className="font-medium">{product.category?.name || 'Bez kategorie'}</span></div>
                          </div>

                          {/* Prodejní cena a Nákupní cena */}
                          <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                            <div><span className="text-gray-600">Prodejní cena (bez DPH):</span> <span className="font-medium">{formatPrice(product.price)}</span></div>
                            <div className="border-l border-gray-200 mx-4"></div>
                            <div><span className="text-gray-600">Nákupní cena:</span> <span className="font-medium">{product.purchasePrice ? formatPrice(product.purchasePrice) : '-'}</span></div>
                          </div>

                          {/* DPH a Cena s DPH */}
                          {isVatPayer && !isNonVatPayer(Number(product.vatRate)) && (
                            <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                              <div><span className="text-gray-600">Sazba DPH:</span> <span className="font-medium">{VAT_RATE_LABELS[Number(product.vatRate)] || `${Number(product.vatRate)}%`}</span></div>
                              <div className="border-l border-gray-200 mx-4"></div>
                              <div><span className="text-gray-600">Prodejní s DPH:</span> <span className="font-medium text-green-700">{formatPrice(calculateVatFromNet(Number(product.price), Number(product.vatRate)).priceWithVat)}</span></div>
                            </div>
                          )}

                          {/* Jednotka a Sklad */}
                          <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                            <div><span className="text-gray-600">Jednotka:</span> <span className="font-medium">{product.unit}</span></div>
                            <div className="border-l border-gray-200 mx-4"></div>
                            <div><span className="text-gray-600">Sklad:</span> <span className="font-medium">{formatQuantity(product.stockQuantity, product.unit)}</span></div>
                          </div>

                          {/* Marže */}
                          {product.purchasePrice && Number(product.purchasePrice) > 0 && (
                            <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                              <div>
                                <span className="text-gray-600">Marže:</span>{' '}
                                <span className="font-medium text-green-700">
                                  {formatPrice(Number(product.price) - Number(product.purchasePrice))}
                                  {' '}
                                  ({((Number(product.price) - Number(product.purchasePrice)) / Number(product.purchasePrice) * 100).toFixed(1)}%)
                                </span>
                              </div>
                              <div className="border-l border-gray-200 mx-4"></div>
                              <div></div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Varianty produktu eshop */}
                      <div className="mt-4 border border-emerald-200 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border-b border-emerald-200">
                          <h4 className="font-semibold text-sm text-emerald-900 flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4" />
                            Varianty produktu (eshop)
                          </h4>
                          <span className="text-xs text-emerald-700">
                            {(eshopVariants[product.id] || []).length} variant
                          </span>
                        </div>

                        {/* Seznam variant */}
                        <div className="bg-white">
                          {(eshopVariants[product.id] || []).length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-3">
                              Žádné varianty — přidejte první variantu níže.
                            </p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gray-50 text-gray-600">
                                  <th className="px-3 py-2 text-left font-medium">Název</th>
                                  <th className="px-3 py-2 text-right font-medium">Cena (Kč)</th>
                                  <th className="px-3 py-2 text-right font-medium">Množství</th>
                                  <th className="px-3 py-2 text-center font-medium">Výchozí</th>
                                  <th className="px-3 py-2 text-center font-medium">Aktivní</th>
                                  <th className="px-3 py-2 text-center font-medium">Akce</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(eshopVariants[product.id] || []).map((v) => (
                                  <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-3 py-2 font-medium">{v.name}</td>
                                    <td className="px-3 py-2 text-right">{Number(v.price).toFixed(2)}</td>
                                    <td className="px-3 py-2 text-right">
                                      {v.variantValue ? `${v.variantValue} ${v.variantUnit ?? ''}`.trim() : '—'}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {v.isDefault ? <span className="text-emerald-600 font-semibold">✓</span> : <span className="text-gray-300">—</span>}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {v.isActive ? <span className="text-emerald-600">✓</span> : <span className="text-red-400">✗</span>}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleEditVariant(product.id, v) }}
                                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                          title="Upravit"
                                        >
                                          <Edit2 className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleDeleteVariant(product.id, v.id, v.name) }}
                                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                                          title="Smazat"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>

                        {/* Formulář přidat / upravit variantu */}
                        <div className="border-t border-emerald-100 bg-emerald-50 px-4 py-3 space-y-2">
                          <p className="text-xs font-semibold text-emerald-800">
                            {editingVariant[product.id] ? `Upravit: ${editingVariant[product.id]!.name}` : 'Přidat variantu'}
                          </p>
                          <div className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-3">
                              <label className="block text-xs text-gray-600 mb-1">Název *</label>
                              <input
                                type="text"
                                value={variantForms[product.id]?.name ?? ''}
                                onChange={(e) => setVariantForms((prev) => ({ ...prev, [product.id]: { ...(prev[product.id] || emptyVariantForm()), name: e.target.value } }))}
                                placeholder="např. 3,5g"
                                className="w-full h-8 px-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-600 mb-1">Cena (Kč) *</label>
                              <input
                                type="number"
                                step="0.01"
                                value={variantForms[product.id]?.price ?? ''}
                                onChange={(e) => setVariantForms((prev) => ({ ...prev, [product.id]: { ...(prev[product.id] || emptyVariantForm()), price: e.target.value } }))}
                                placeholder="0"
                                className="w-full h-8 px-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-600 mb-1">Množství</label>
                              <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={variantForms[product.id]?.variantValue ?? ''}
                                onChange={(e) => setVariantForms((prev) => ({ ...prev, [product.id]: { ...(prev[product.id] || emptyVariantForm()), variantValue: e.target.value } }))}
                                placeholder="100"
                                className="w-full h-8 px-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="col-span-1">
                              <label className="block text-xs text-gray-600 mb-1">Jednotka</label>
                              <select
                                value={variantForms[product.id]?.variantUnit ?? ''}
                                onChange={(e) => setVariantForms((prev) => ({ ...prev, [product.id]: { ...(prev[product.id] || emptyVariantForm()), variantUnit: e.target.value as 'g' | 'ml' | 'ks' | '' } }))}
                                className="w-full h-8 px-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 bg-white"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="">—</option>
                                <option value="g">g</option>
                                <option value="ml">ml</option>
                                <option value="ks">ks</option>
                              </select>
                            </div>
                            <div className="col-span-2 flex items-center gap-3 pb-1">
                              <label className="flex items-center gap-1 text-xs cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={variantForms[product.id]?.isDefault ?? false}
                                  onChange={(e) => setVariantForms((prev) => ({ ...prev, [product.id]: { ...(prev[product.id] || emptyVariantForm()), isDefault: e.target.checked } }))}
                                  className="accent-emerald-600"
                                />
                                Výchozí
                              </label>
                              <label className="flex items-center gap-1 text-xs cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={variantForms[product.id]?.isActive ?? true}
                                  onChange={(e) => setVariantForms((prev) => ({ ...prev, [product.id]: { ...(prev[product.id] || emptyVariantForm()), isActive: e.target.checked } }))}
                                  className="accent-emerald-600"
                                />
                                Aktivní
                              </label>
                            </div>
                            <div className="col-span-2 flex gap-1 pb-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleVariantSubmit(product.id) }}
                                disabled={variantLoading[product.id]}
                                className="flex-1 h-8 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                              >
                                {variantLoading[product.id] ? '...' : editingVariant[product.id] ? 'Uložit' : 'Přidat'}
                              </button>
                              {editingVariant[product.id] && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCancelVariantEdit(product.id) }}
                                  className="h-8 px-2 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition-colors"
                                >
                                  Zrušit
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tlačítka akcí */}
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(product)
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                          title="Upravit"
                        >
                          <Edit2 className="h-4 w-4" />
                          Upravit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(product)
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                          title="Smazat"
                        >
                          <Trash2 className="h-4 w-4" />
                          Smazat
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Stránkování */}
            {filteredAndSortedProducts.length > 0 && (() => {
              const pages: (number | string)[] = []

              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i)
                }
              } else {
                pages.push(1)
                if (currentPage <= 3) {
                  pages.push(2, 3, 4)
                  pages.push('...')
                  pages.push(totalPages)
                } else if (currentPage >= totalPages - 2) {
                  pages.push('...')
                  pages.push(totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
                } else {
                  pages.push('...')
                  pages.push(currentPage - 1, currentPage, currentPage + 1)
                  pages.push('...')
                  pages.push(totalPages)
                }
              }

              return (
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Zobrazit:</span>
                    {[10, 20, 50, 100].map(count => (
                      <button
                        key={count}
                        onClick={() => {
                          setItemsPerPage(count)
                          setCurrentPage(1)
                        }}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          itemsPerPage === count
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                    <span className="text-sm text-gray-500 ml-2">
                      ({filteredAndSortedProducts.length} celkem)
                    </span>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        Předchozí
                      </button>

                      {pages.map((page, index) => {
                        if (page === '...') {
                          return (
                            <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                              ...
                            </span>
                          )
                        }

                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page as number)}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                              currentPage === page
                                ? 'bg-orange-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      })}

                      <button
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        Další
                      </button>
                    </div>
                  )}
                </div>
              )
            })()}
          </>
        )}
      </div>
    </div>
  )
}
