'use client'

import { useRouter } from 'next/navigation'
import { LoadingState, ErrorState } from '@/components/erp'
import {
  useBatchDetail,
  BatchDetailHeader,
  BatchMovementsTable,
} from '@/features/batches'

export const dynamic = 'force-dynamic'

export default function BatchDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { detail, loading, error, saving, handleStatusChange } = useBatchDetail(params.id)

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={() => window.location.reload()} />
  if (!detail) return null

  const { batch, movements, currentStock, totalReceived, totalConsumed } = detail

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <BatchDetailHeader
        batch={batch}
        currentStock={currentStock}
        totalReceived={totalReceived}
        totalConsumed={totalConsumed}
        saving={saving}
        onStatusChange={handleStatusChange}
        onBack={() => router.push('/batches')}
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">Historie pohybů</h2>
          <p className="text-xs text-gray-400">{movements.length} pohybů</p>
        </div>
        <BatchMovementsTable
          movements={movements}
          productUnit={batch.product?.unit ?? ''}
        />
      </div>

      {batch.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-1">Poznámky</p>
          <p className="text-sm text-gray-700">{batch.notes}</p>
        </div>
      )}
    </div>
  )
}
