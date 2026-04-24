'use client'

import { useEffect } from 'react'
import { LoadingState, ErrorState } from '@/components/erp'
import { useNavbarMeta } from '@/components/NavbarMetaContext'
import {
  useInventory, useProductMovements,
  InventoryTable, MovementTable, ManualAdjustmentModal,
} from '@/features/inventory'

export const dynamic = 'force-dynamic'

export default function InventoryPage() {
  const { setMeta } = useNavbarMeta()
  const inv = useInventory()
  const mov = useProductMovements(inv.ep.rows, inv.products, inv.ep.refresh)

  useEffect(() => {
    if (mov.selectedProductId) return
    setMeta({ count: `Zobrazeno ${inv.filteredAndSorted.length} z ${inv.ep.rows.length}` })
    return () => setMeta({ count: '' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inv.filteredAndSorted.length, inv.ep.rows.length, mov.selectedProductId])

  useEffect(() => {
    if (!mov.selectedProductId) return
    const productSummary = inv.ep.rows.find(s => s.productId === mov.selectedProductId)
    if (!productSummary) return
    setMeta({
      count:            `(${mov.filteredMovements.length}/${mov.stockMovements.length})`,
      subTitle:         productSummary.productName,
      pageTitleOnClick: mov.handleBackToInventory,
    })
    return () => setMeta({ count: '', subTitle: undefined, pageTitleOnClick: null })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mov.selectedProductId, mov.filteredMovements.length, mov.stockMovements.length, mov.handleBackToInventory])

  if (inv.ep.loading) return <LoadingState />
  if (inv.ep.error)   return <ErrorState message={inv.ep.error} onRetry={inv.ep.refresh} />
  if (mov.selectedProductId && mov.loadingMovements) return <LoadingState />

  if (mov.selectedProductId) {
    return (
      <div className="space-y-6">
        {mov.showManualAdjustmentForm && (
          <ManualAdjustmentModal
            adjustmentType={mov.adjustmentType}
            setAdjustmentType={mov.setAdjustmentType}
            adjustmentQuantity={mov.adjustmentQuantity}
            setAdjustmentQuantity={mov.setAdjustmentQuantity}
            adjustmentDate={mov.adjustmentDate}
            setAdjustmentDate={mov.setAdjustmentDate}
            adjustmentNote={mov.adjustmentNote}
            setAdjustmentNote={mov.setAdjustmentNote}
            onSubmit={mov.handleManualAdjustment}
            onClose={mov.closeManualAdjustment}
          />
        )}
        {mov.filters.bar('auto 1fr 1fr 1fr 1fr')}
        <MovementTable
          filteredMovements={mov.filteredMovements}
          stockMovements={mov.stockMovements}
          highlightMovementId={mov.highlightMovementId}
          expandedMovements={mov.expandedMovements}
          onToggle={mov.toggleMovement}
          movementsPage={mov.movementsPage}
          movementsPerPage={mov.movementsPerPage}
          setMovementsPerPage={mov.setMovementsPerPage}
          onPageChange={mov.handleMovementsPageChange}
          movementsSectionRef={mov.movementsSectionRef}
          isVatPayer={inv.isVatPayer}
          selectedProductId={mov.selectedProductId}
          summaryRows={inv.ep.rows}
          onOpenAdjustment={() => mov.setShowManualAdjustmentForm(true)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {inv.filters.bar('auto 1fr 1fr 1fr 1fr 1fr 1fr 1fr')}
      <InventoryTable
        filteredAndSorted={inv.filteredAndSorted}
        highlightId={inv.highlightId}
        sortField={inv.sortField}       sortDirection={inv.sortDirection} onSort={inv.handleSort}
        currentPage={inv.ep.page}       itemsPerPage={inv.itemsPerPage}
        setItemsPerPage={inv.setItemsPerPage} setCurrentPage={inv.ep.setPage}
        onPageChange={inv.handlePageChange}
        onSelectProduct={mov.setSelectedProductId}
        sectionRef={inv.sectionRef}
      />
    </div>
  )
}
