'use client'

import { Package } from 'lucide-react'
import { EntityPage, LoadingState, ErrorState } from '@/components/erp'
import { useProducts, ProductTable } from '@/features/products'

export const dynamic = 'force-dynamic'

export default function ProductsPage() {
  const p = useProducts()

  if (p.ep.loading) return <LoadingState />
  if (p.ep.error)   return <ErrorState message={p.ep.error} onRetry={p.ep.refresh} />

  const filterCols = p.isVatPayer ? 'auto 1fr 1fr 1fr 1fr' : 'auto 1fr 1fr 1fr'

  return (
    <EntityPage highlightId={null}>
      <EntityPage.Header
        title="Katalog zboží"
        icon={Package}
        color="amber"
        total={p.ep.rows.length}
        filtered={p.sorted.length}
        onRefresh={p.ep.refresh}
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
      />

      <EntityPage.Pagination page={p.ep.page} total={p.totalPages} onChange={p.ep.setPage} />
    </EntityPage>
  )
}
