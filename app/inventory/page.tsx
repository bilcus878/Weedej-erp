'use client'

import { useEffect } from 'react'
import { Warehouse } from 'lucide-react'
import { EntityPage, LoadingState, ErrorState } from '@/components/erp'
import { useNavbarMeta } from '@/components/NavbarMetaContext'
import {
  useInventory, useProductMovements,
  InventoryFiltersBar, InventoryTable,
  MovementFiltersBar, MovementTable, ManualAdjustmentModal,
} from '@/features/inventory'

export const dynamic = 'force-dynamic'

export default function InventoryPage() {
  const { setMeta } = useNavbarMeta()
  const inv = useInventory()
  const mov = useProductMovements(inv.ep.rows, inv.products, inv.ep.refresh)

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
        <MovementFiltersBar
          filterDate={mov.filterDate}              setFilterDate={mov.setFilterDate}
          filterType={mov.filterType}              setFilterType={mov.setFilterType}
          filterTypeDropdownOpen={mov.filterTypeDropdownOpen} setFilterTypeDropdownOpen={mov.setFilterTypeDropdownOpen}
          filterTypeRef={mov.filterTypeRef}
          filterMinQuantity={mov.filterMinQuantity} setFilterMinQuantity={mov.setFilterMinQuantity}
          filterNote={mov.filterNote}              setFilterNote={mov.setFilterNote}
          onClear={mov.clearMovementFilters}
        />
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
    <EntityPage highlightId={inv.ep.highlightId}>
      <EntityPage.Header
        title="Skladová evidence"
        icon={Warehouse}
        color="purple"
        total={inv.ep.rows.length}
        filtered={inv.filteredAndSorted.length}
        onRefresh={inv.ep.refresh}
      />
      <InventoryFiltersBar
        categories={inv.categories}
        filterName={inv.filterName}              setFilterName={inv.setFilterName}
        filterCategory={inv.filterCategory}      setFilterCategory={inv.setFilterCategory}
        filterCategoryDropdownOpen={inv.filterCategoryDropdownOpen} setFilterCategoryDropdownOpen={inv.setFilterCategoryDropdownOpen}
        filterCategoryRef={inv.filterCategoryRef}
        filterMinStock={inv.filterMinStock}      setFilterMinStock={inv.setFilterMinStock}
        filterMinReserved={inv.filterMinReserved} setFilterMinReserved={inv.setFilterMinReserved}
        filterMinAvailable={inv.filterMinAvailable} setFilterMinAvailable={inv.setFilterMinAvailable}
        filterMinExpected={inv.filterMinExpected} setFilterMinExpected={inv.setFilterMinExpected}
        filterStatus={inv.filterStatus}          setFilterStatus={inv.setFilterStatus}
        filterStatusDropdownOpen={inv.filterStatusDropdownOpen} setFilterStatusDropdownOpen={inv.setFilterStatusDropdownOpen}
        filterStatusRef={inv.filterStatusRef}
        onClear={inv.clearFilters}
      />
      <InventoryTable
        filteredAndSorted={inv.filteredAndSorted}
        highlightId={inv.ep.highlightId}
        sortField={inv.sortField}       sortDirection={inv.sortDirection} onSort={inv.handleSort}
        currentPage={inv.currentPage}   itemsPerPage={inv.itemsPerPage}
        setItemsPerPage={inv.setItemsPerPage} setCurrentPage={inv.setCurrentPage}
        onPageChange={inv.handlePageChange}
        onSelectProduct={mov.setSelectedProductId}
        sectionRef={inv.sectionRef}
      />
    </EntityPage>
  )
}
