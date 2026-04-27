'use client'

import { useState } from 'react'
import { Package, Plus, Truck } from 'lucide-react'
import { EntityPage, LoadingState, ErrorState } from '@/components/erp'
import { useProducts, ProductTable } from '@/features/products'
import { ShippingSettingsModal } from '@/features/shipping'

export const dynamic = 'force-dynamic'

export default function ProductsPage() {
  const p = useProducts()
  const [shippingOpen, setShippingOpen] = useState(false)

  if (p.ep.loading) return <LoadingState />
  if (p.ep.error)   return <ErrorState message={p.ep.error} onRetry={p.ep.refresh} />

  const filterCols = p.isVatPayer ? 'auto 1fr 1fr 1fr 1fr' : 'auto 1fr 1fr 1fr'

  return (
    <>
      {shippingOpen && <ShippingSettingsModal onClose={() => setShippingOpen(false)} />}

      <EntityPage highlightId={null}>
        <EntityPage.Header
          title="Katalog zboží"
          icon={Package}
          color="amber"
          total={p.ep.rows.length}
          filtered={p.sorted.length}
          onRefresh={p.ep.refresh}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShippingOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors border border-slate-200"
              >
                <Truck className="w-4 h-4" />Nastavení dopravy
              </button>
              <button
                onClick={() => p.setPopupOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />Nový produkt
              </button>
            </div>
          }
        />

        {p.filters.bar(filterCols)}

        <ProductTable
          ep={p.ep}
          categories={p.categories}
          isVatPayer={p.isVatPayer}
          paginated={p.paginated}
          popupOpen={p.popupOpen}
          setPopupOpen={p.setPopupOpen}
          sortField={p.sortField}
          sortDir={p.sortDir}
          toggleSort={p.toggleSort}
          inlineEditForms={p.inlineEditForms}
          setInlineEditForms={p.setInlineEditForms}
          eshopVariants={p.eshopVariants}
          variantForms={p.variantForms}
          setVariantForms={p.setVariantForms}
          editingVariant={p.editingVariant}
          variantLoading={p.variantLoading}
          handleToggleExpand={p.handleToggleExpand}
          handleInlineEdit={p.handleInlineEdit}
          handleInlineCancel={p.handleInlineCancel}
          handleInlineSave={p.handleInlineSave}
          handleDelete={p.handleDelete}
          handleVariantSubmit={p.handleVariantSubmit}
          handleEditVariant={p.handleEditVariant}
          handleCancelVariantEdit={p.handleCancelVariantEdit}
          handleDeleteVariant={p.handleDeleteVariant}
          hideTrigger
        />

        <EntityPage.Pagination page={p.ep.page} total={p.totalPages} onChange={p.ep.setPage} />
      </EntityPage>
    </>
  )
}
