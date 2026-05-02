'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RefreshCw, Printer, XCircle, ExternalLink } from 'lucide-react'
import { ERPDetailPageLayout } from '@/components/erp/detail'
import {
  SupplierContactSection,
  PurchaseItemsSection,
  StornoSection,
  DocumentActionsCard,
  StatusTimelineCard,
  DocumentOverviewCard,
} from '@/components/erp/detail'
import type { TimelineEntry } from '@/components/erp/detail'
import { useNavbarMeta } from '@/components/erp/navbar/NavbarMetaContext'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import { useToast } from '@/components/ui/useToast'
import { Toast } from '@/components/ui/Toast'
import {
  useReceiptDetail,
  useReceiptActions,
  ReceiptStatusBadge,
  mapReceiptToSupplierDetail,
} from '@/features/receipts'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<string, { label: string; color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'orange' }> = {
  received:  { label: 'Přijato', color: 'green' },
  storno:    { label: 'STORNO',  color: 'red'   },
  cancelled: { label: 'STORNO',  color: 'red'   },
}

function buildTimeline(receipt: any): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    { toStatus: 'received', changedAt: receipt.receiptDate, statusLabel: 'Přijato' },
  ]
  if ((receipt.status === 'storno' || receipt.status === 'cancelled') && receipt.stornoAt) {
    entries.push({ toStatus: 'storno', changedAt: receipt.stornoAt, statusLabel: 'STORNO' })
  }
  return entries
}

const BASE_CRUMBS = [{ label: 'Příjemky', href: '/receipts' }]

export default function ReceiptDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { receipt, loading, error, refresh } = useReceiptDetail(params.id)
  const { isVatPayer }    = useCompanySettings()
  const { toast, showToast } = useToast()
  const actions           = useReceiptActions(isVatPayer, showToast, refresh)
  const { setMeta }       = useNavbarMeta()

  useEffect(() => {
    if (receipt) {
      setMeta({ subTitle: receipt.receiptNumber, pageTitleOnClick: () => router.push('/receipts') })
    }
  }, [receipt?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const breadcrumbs = [...BASE_CRUMBS, { label: receipt?.receiptNumber ?? '…' }]

  if (error === 'not_found') return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Příjemka nenalezena" notFound />
  if (error)                 return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Chyba" error={error} />
  if (loading || !receipt)   return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Načítání…" isLoading />

  const mapped   = mapReceiptToSupplierDetail(receipt, isVatPayer)
  const isStorno = receipt.status === 'storno' || receipt.status === 'cancelled'

  const inventoryLookup: Record<string, string> = {}
  for (const item of receipt.items) {
    if (item.productId && item.inventoryItemId) {
      inventoryLookup[item.productId] = item.inventoryItemId
    }
  }

  const docActions = [
    {
      label:   'Tisk / PDF',
      icon:    <Printer />,
      variant: 'secondary' as const,
      onClick: () => actions.handleDownloadPDF(receipt),
    },
    {
      label:   'Stornovat',
      icon:    <XCircle />,
      variant: 'danger' as const,
      onClick: () => actions.handleStorno(receipt),
      hidden:  isStorno,
    },
  ]

  const overviewRows = [
    { label: 'Číslo příjemky', value: <span className="font-mono text-indigo-600">{receipt.receiptNumber}</span> },
    { label: 'Datum',          value: new Date(receipt.receiptDate).toLocaleDateString('cs-CZ') },
    { label: 'Položek',        value: receipt.items.length },
    ...(receipt.purchaseOrder ? [{
      label: 'Objednávka',
      value: (
        <Link href={`/purchase-orders/${receipt.purchaseOrder.id}`} className="font-mono text-indigo-600 hover:underline flex items-center gap-0.5">
          {receipt.purchaseOrder.orderNumber}
          <ExternalLink className="w-3 h-3" />
        </Link>
      ),
    }] : []),
    ...(receipt.receivedInvoice ? [{
      label: 'Faktura',
      value: <span className="font-mono text-indigo-600">{receipt.receivedInvoice.invoiceNumber}</span>,
    }] : []),
  ]

  return (
    <>
      <ERPDetailPageLayout
        breadcrumbs={breadcrumbs}
        title={receipt.receiptNumber}
        subtitle={mapped.supplierName ?? undefined}
        statusBadge={<ReceiptStatusBadge status={receipt.status} />}
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
            <DocumentActionsCard actions={docActions} />
            <StatusTimelineCard entries={buildTimeline(receipt)} statusConfig={STATUS_CONFIG} />
            <DocumentOverviewCard rows={overviewRows} />
          </div>
        }
      >
        <SupplierContactSection
          name={mapped.supplierName}
          email={mapped.supplierEmail}
          phone={mapped.supplierPhone}
          address={mapped.supplierAddress}
          entityType={mapped.supplierEntityType}
          ico={mapped.supplierICO}
          dic={mapped.supplierDIC}
        />

        {isStorno && <StornoSection stornoAt={mapped.stornoAt} stornoReason={mapped.stornoReason} />}

        <PurchaseItemsSection
          items={mapped.items}
          isVatPayer={isVatPayer}
          inventoryLookup={inventoryLookup}
          totalAmount={mapped.totalAmount}
        />
      </ERPDetailPageLayout>

      {toast && <Toast toast={toast} />}
    </>
  )
}
