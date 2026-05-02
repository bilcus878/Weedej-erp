'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Printer } from 'lucide-react'
import { ERPDetailPageLayout } from '@/components/erp/detail'
import {
  SupplierContactSection,
  PaymentTermsSection,
  PurchaseItemsSection,
  LinkedReceiptsSection,
  StornoSection,
  DocumentActionsCard,
  StatusTimelineCard,
  DocumentOverviewCard,
} from '@/components/erp/detail'
import type { TimelineEntry } from '@/components/erp/detail'
import { useNavbarMeta } from '@/components/erp/navbar/NavbarMetaContext'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import {
  usePurchaseOrderDetail,
  usePurchaseOrderActions,
  PurchaseOrderStatusBadge,
  mapPurchaseOrderToSupplierDetail,
} from '@/features/purchase-orders'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<string, { label: string; color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'orange' }> = {
  pending:            { label: 'Čeká',            color: 'yellow' },
  confirmed:          { label: 'Potvrzena',        color: 'blue'   },
  partially_received: { label: 'Částečně přijata', color: 'orange' },
  received:           { label: 'Přijata',          color: 'green'  },
  storno:             { label: 'STORNO',           color: 'red'    },
}

function buildTimeline(order: any): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    { toStatus: 'pending', changedAt: order.orderDate, statusLabel: 'Objednáno' },
  ]
  if (order.status !== 'pending' && order.status !== 'storno') {
    entries.push({ toStatus: order.status, changedAt: order.orderDate, statusLabel: STATUS_CONFIG[order.status]?.label ?? order.status })
  }
  if (order.status === 'storno' && order.stornoAt) {
    entries.push({ toStatus: 'storno', changedAt: order.stornoAt, statusLabel: 'STORNO' })
  }
  return entries
}

const BASE_CRUMBS = [{ label: 'Objednávky vydané', href: '/purchase-orders' }]

export default function PurchaseOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { order, loading, error, refresh } = usePurchaseOrderDetail(params.id)
  const { isVatPayer }       = useCompanySettings()
  const { handleDownloadPDF } = usePurchaseOrderActions()
  const { setMeta }          = useNavbarMeta()

  useEffect(() => {
    if (order) {
      setMeta({ subTitle: order.orderNumber, pageTitleOnClick: () => router.push('/purchase-orders') })
    }
  }, [order?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const breadcrumbs = [...BASE_CRUMBS, { label: order?.orderNumber ?? '…' }]

  if (error === 'not_found') return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Objednávka nenalezena" notFound />
  if (error)                 return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Chyba" error={error} />
  if (loading || !order)     return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Načítání…" isLoading />

  const mapped   = mapPurchaseOrderToSupplierDetail(order)
  const isStorno = order.status === 'storno'

  const inventoryLookup: Record<string, string> = {}
  for (const receipt of mapped.receipts ?? []) {
    for (const item of receipt.items) {
      if (item.productId && item.inventoryItemId) {
        inventoryLookup[item.productId] = item.inventoryItemId
      }
    }
  }

  const firstReceiptDate = mapped.receipts?.find(r => r.status !== 'storno')?.receiptDate ?? null

  const actions = [
    {
      label:   'Tisk / PDF',
      icon:    <Printer />,
      variant: 'secondary' as const,
      onClick: () => handleDownloadPDF(order.id),
    },
  ]

  const overviewRows = [
    { label: 'Číslo obj.',  value: <span className="font-mono text-indigo-600">{order.orderNumber}</span> },
    { label: 'Datum',       value: new Date(order.orderDate).toLocaleDateString('cs-CZ') },
    { label: 'Položek',     value: order.items.length },
    ...(mapped.receipts?.length ? [{ label: 'Příjemky',  value: mapped.receipts.length }] : []),
    ...(mapped.receivedInvoice  ? [{ label: 'Faktura',   value: <span className="font-mono text-indigo-600">{mapped.receivedInvoice.invoiceNumber}</span> }] : []),
  ]

  return (
    <ERPDetailPageLayout
      breadcrumbs={breadcrumbs}
      title={order.orderNumber}
      subtitle={mapped.supplierName ?? undefined}
      statusBadge={<PurchaseOrderStatusBadge status={order.status} />}
      actions={
        <button
          onClick={refresh}
          title="Obnovit"
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      }
      sidebar={
        <div className="space-y-4">
          <DocumentActionsCard actions={actions} />
          <StatusTimelineCard entries={buildTimeline(order)} statusConfig={STATUS_CONFIG} />
          <DocumentOverviewCard rows={overviewRows} />
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SupplierContactSection
          name={mapped.supplierName}
          email={mapped.supplierEmail}
          phone={mapped.supplierPhone}
          address={mapped.supplierAddress}
          contactPerson={mapped.supplierContactPerson}
          entityType={mapped.supplierEntityType}
          ico={mapped.supplierICO}
          dic={mapped.supplierDIC}
          bankAccount={mapped.supplierBankAccount}
          website={mapped.supplierWebsite}
        />
        <PaymentTermsSection
          paymentType={mapped.paymentType}
          dueDate={mapped.dueDate}
          variableSymbol={mapped.variableSymbol}
          expectedDate={mapped.expectedDate}
          firstReceiptDate={firstReceiptDate}
        />
      </div>

      {isStorno && <StornoSection stornoAt={mapped.stornoAt} stornoReason={mapped.stornoReason} />}

      <PurchaseItemsSection
        items={mapped.items}
        isVatPayer={isVatPayer}
        inventoryLookup={inventoryLookup}
        discountAmount={mapped.discountAmount}
        totalAmount={mapped.totalAmount}
      />

      {(mapped.receipts?.length ?? 0) > 0 && (
        <LinkedReceiptsSection receipts={mapped.receipts!} />
      )}
    </ERPDetailPageLayout>
  )
}
