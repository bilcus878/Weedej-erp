'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RefreshCw, Printer, XCircle, FileEdit, FileText, ExternalLink } from 'lucide-react'
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
  useReceivedInvoiceDetail,
  useReceivedInvoiceActions,
  ReceivedInvoiceStatusBadge,
  InvoiceDiscountWidget,
  CompleteInvoiceForm,
  mapInvoiceToSupplierDetail,
} from '@/features/invoices-received'
import type { ReceivedInvoice } from '@/features/invoices-received'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<string, { label: string; color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'orange' }> = {
  pending:            { label: 'Čeká',            color: 'yellow' },
  confirmed:          { label: 'Potvrzena',        color: 'blue'   },
  partially_received: { label: 'Částečně přijata', color: 'orange' },
  received:           { label: 'Přijato',          color: 'green'  },
  storno:             { label: 'STORNO',           color: 'red'    },
}

function buildTimeline(invoice: ReceivedInvoice): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    { toStatus: invoice.status ?? 'pending', changedAt: invoice.invoiceDate, statusLabel: STATUS_CONFIG[invoice.status ?? 'pending']?.label ?? invoice.status ?? 'Čeká' },
  ]
  if ((invoice.status === 'storno') && invoice.stornoAt) {
    entries.push({ toStatus: 'storno', changedAt: invoice.stornoAt, statusLabel: 'STORNO' })
  }
  return entries
}

const BASE_CRUMBS = [{ label: 'Přijaté faktury', href: '/invoices/received' }]

export default function ReceivedInvoiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { invoice, loading, error, refresh } = useReceivedInvoiceDetail(params.id)
  const { isVatPayer } = useCompanySettings()
  const actions        = useReceivedInvoiceActions(invoice ? [invoice] : [], refresh)
  const { setMeta }    = useNavbarMeta()

  const [showCompleteForm, setShowCompleteForm] = useState(false)

  useEffect(() => {
    if (invoice) {
      setMeta({ subTitle: invoice.invoiceNumber, pageTitleOnClick: () => router.push('/invoices/received') })
    }
  }, [invoice?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const breadcrumbs = [...BASE_CRUMBS, { label: invoice?.invoiceNumber ?? '…' }]

  if (error === 'not_found') return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Faktura nenalezena" notFound />
  if (error)                 return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Chyba" error={error} />
  if (loading || !invoice)   return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Načítání…" isLoading />

  const mapped   = mapInvoiceToSupplierDetail(invoice)
  const isStorno = invoice.status === 'storno'

  const inventoryLookup: Record<string, string> = {}
  for (const receipt of mapped.receipts ?? []) {
    for (const item of receipt.items) {
      if (item.productId && item.inventoryItemId) {
        inventoryLookup[item.productId] = item.inventoryItemId
      }
    }
  }

  const firstReceiptDate = mapped.receipts?.find(r => r.status !== 'storno')?.receiptDate ?? null

  const docActions = [
    {
      label:   'Tisk / PDF',
      icon:    <Printer />,
      variant: 'secondary' as const,
      onClick: () => actions.handleDownloadPDF(invoice.id),
    },
    {
      label:   'Doplnit fakturu',
      icon:    <FileEdit />,
      variant: 'secondary' as const,
      onClick: () => setShowCompleteForm(true),
      hidden:  isStorno,
    },
    {
      label:   'Stornovat',
      icon:    <XCircle />,
      variant: 'danger' as const,
      onClick: async () => {
        const reason = prompt(`Opravdu chceš stornovat fakturu ${invoice.invoiceNumber}?\n\nZadej důvod storna (volitelně):`)
        if (reason === null) return
        try {
          await actions.handleStorno(invoice.id)
          await refresh()
        } catch {}
      },
      hidden: isStorno,
    },
  ]

  const attachmentAction = invoice.attachmentUrl
    ? {
        label:   'Zobrazit přílohu',
        icon:    <FileText />,
        variant: 'secondary' as const,
        onClick: () => window.open(`/api/received-invoices/${invoice.id}/attachment`, '_blank'),
      }
    : null

  const overviewRows = [
    { label: 'Číslo faktury', value: <span className="font-mono text-indigo-600">{invoice.invoiceNumber}</span> },
    { label: 'Datum',         value: new Date(invoice.invoiceDate).toLocaleDateString('cs-CZ') },
    ...(invoice.dueDate ? [{ label: 'Splatnost', value: new Date(invoice.dueDate).toLocaleDateString('cs-CZ') }] : []),
    { label: 'Typ platby',    value: invoice.paymentType === 'cash' ? 'Hotovost' : invoice.paymentType === 'card' ? 'Karta' : 'Převod' },
    ...(invoice.purchaseOrder ? [{
      label: 'Objednávka',
      value: (
        <Link href={`/purchase-orders/${invoice.purchaseOrder.id}`} className="font-mono text-indigo-600 hover:underline flex items-center gap-0.5">
          {invoice.purchaseOrder.orderNumber}
          <ExternalLink className="w-3 h-3" />
        </Link>
      ),
    }] : []),
    ...(mapped.receipts?.length ? [{ label: 'Příjemky', value: mapped.receipts.length }] : []),
  ]

  return (
    <>
      <ERPDetailPageLayout
        breadcrumbs={breadcrumbs}
        title={invoice.invoiceNumber}
        subtitle={mapped.supplierName ?? undefined}
        statusBadge={<ReceivedInvoiceStatusBadge status={invoice.status ?? 'pending'} />}
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
            <DocumentActionsCard actions={[...docActions, ...(attachmentAction ? [attachmentAction] : [])]} />
            <StatusTimelineCard entries={buildTimeline(invoice)} statusConfig={STATUS_CONFIG} />
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
            expectedDate={invoice.purchaseOrder?.expectedDate}
            firstReceiptDate={firstReceiptDate}
          />
        </div>

        {isStorno && <StornoSection stornoAt={mapped.stornoAt} stornoReason={mapped.stornoReason} />}

        {mapped.items.length > 0 && (
          <PurchaseItemsSection
            items={mapped.items}
            isVatPayer={isVatPayer}
            inventoryLookup={inventoryLookup}
            discountAmount={mapped.discountAmount}
            totalAmount={mapped.totalAmount}
            title="Položky objednávky"
          />
        )}

        {!isStorno && !invoice.discountAmount && (invoice.purchaseOrder?.items?.length ?? 0) > 0 && (
          <InvoiceDiscountWidget invoice={invoice} onApplyDiscount={actions.handleApplyDiscount} />
        )}

        {(mapped.receipts?.length ?? 0) > 0 && (
          <LinkedReceiptsSection receipts={mapped.receipts!} />
        )}

        {!invoice.attachmentUrl && !isStorno && (
          <div className="flex justify-end">
            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors cursor-pointer">
              <FileText className="w-3.5 h-3.5" />
              Nahrát přílohu
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={e => { actions.handleFileUpload(e, invoice.id); refresh() }}
              />
            </label>
          </div>
        )}
      </ERPDetailPageLayout>

      {showCompleteForm && (
        <CompleteInvoiceForm
          invoice={invoice}
          open={showCompleteForm}
          onClose={() => setShowCompleteForm(false)}
          onSuccess={refresh}
          isVatPayer={isVatPayer}
        />
      )}
    </>
  )
}
