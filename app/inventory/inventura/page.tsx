'use client'

import {
  useInventura,
  InventuraGuide,
  InventuraActionBar,
  InventuraStats,
  InventuraFilters,
  InventuraTable,
  InventuraHistory,
  InventuraDetailModal,
} from '@/features/inventura'

export default function InventuraPage() {
  const v = useInventura()

  if (v.loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Načítání inventury…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {v.inventuraActive ? (
        <>
          <InventuraActionBar
            stats={v.inventuraStats}
            saving={v.saving}
            onCancel={v.cancelInventura}
            onSave={v.saveInventura}
          />
          <InventuraStats stats={v.inventuraStats} />
          <InventuraFilters
            searchQuery={v.searchQuery}        setSearchQuery={v.setSearchQuery}
            categoryFilter={v.categoryFilter}  setCategoryFilter={v.setCategoryFilter}
            showOnlyDiffs={v.showOnlyDiffs}    setShowOnlyDiffs={v.setShowOnlyDiffs}
            categories={v.categories}
          />
          <InventuraTable
            items={v.filteredItems}
            onUpdateActualStock={v.updateActualStock}
            onSetAsSystem={v.setAsSystem}
          />
        </>
      ) : (
        <>
          <InventuraGuide onStart={v.startInventura} />
          <InventuraHistory
            history={v.inventuraHistory}
            open={v.showHistory}
            onToggle={() => v.setShowHistory(!v.showHistory)}
            onSelect={v.fetchInventuraDetail}
          />
        </>
      )}

      {v.selectedInventura && (
        <InventuraDetailModal
          detail={v.selectedInventura}
          filteredItems={v.filteredDetailItems}
          loadingDetail={v.loadingDetail}
          historySearch={v.historySearch}           setHistorySearch={v.setHistorySearch}
          historyShowOnlyDiffs={v.historyShowOnlyDiffs} setHistoryShowOnlyDiffs={v.setHistoryShowOnlyDiffs}
          onClose={v.closeDetail}
        />
      )}
    </div>
  )
}
