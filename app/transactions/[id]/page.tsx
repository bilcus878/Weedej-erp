'use client'

import { useEffect }  from 'react'
import { useRouter }  from 'next/navigation'
import Link           from 'next/link'
import { RefreshCw, Printer, ExternalLink } from 'lucide-react'
import { ERPDetailPageLayout } from '@/components/erp/detail'
import {
  CustomerContactSection,
  StornoSection,
  OrderItemsSection,
  DocumentActionsCard,
  StatusTimelineCard,
  DocumentOverviewCard,
} from '@/components/erp/detail'
import type { TimelineEntry } from '@/components/erp/detail'
import { useNavbarMeta }      from '@/components/erp/navbar/NavbarMetaContext'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import {
  useTransactionDetail,
  useTransactionActions,
  TransactionStatusBadge,
  mapTransactionToOrderDetail,
  SumUpReceiptLink,
} from '@/features/transactions'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<string, { label: string; color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'orange' }> = {
  completed: { label: 'Dokončeno', color: 'green'  },
  pending:   { label: 'Čeká',      color: 'yellow' },
  storno:    { label: 'Storno',    color: 'red'    },
}

function buildTimeline(tx: { transactionDate: string; status: string }): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    { toStatus: tx.status, changedAt: tx.transactionDate, statusLabel: STATUS_CONFIG[tx.status]?.label ?? tx.status },
  ]
  return entries
}

const BASE_CRUMBS = [{ label: 'Sumup objednávky', href: '/transactions' }]

export default function TransactionDetailPage({ params }: { params: { id: string } }) {
  const router  = useRouter()
  const { transaction, loading, error, refresh } = useTransactionDetail(params.id)
  const { isVatPayer }  = useCompanySettings()
  const { handlePrintPDF } = useTransactionActions(refresh)
  const { setMeta } = useNavbarMeta()

  useEffect(() => {
    if (transaction) setMeta({ subTitle: transaction.transactionCode, pageTitleOnClick: () => router.push('/transactions') })
  }, [transaction?.transactionCode]) // eslint-disable-line react-hooks/exhaustive-deps

  const breadcrumbs = [...BASE_CRUMBS, { label: transaction?.transactionCode ?? '…' }]

  if (error === 'not_found') return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Transakce nenalezena" notFound />
  if (error)                   return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Chyba" error={error} />
  if (loading || !transaction) return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Načítání…" isLoading />

  const mapped   = mapTransactionToOrderDetail(transaction)
  const isStorno = transaction.status === 'storno'
  const canPrint = !!transaction.transactionCode.match(/^\d{7}$/) || !!transaction.issuedInvoice?.id

  const actions = [
    {
      label:    'Tisk / PDF',
      icon:     <Printer />,
      variant:  'secondary' as const,
      onClick:  () => handlePrintPDF(transaction),
      disabled: !canPrint,
    },
  ]

  const overviewRows = [
    {
      label: 'Kód transakce',
      value: <span className="font-mono text-indigo-600">{transaction.transactionCode}</span>,
    },
    ...(transaction.sumupTransactionCode ? [{
      label: 'SumUp kód',
      value: <span className="font-mono text-gray-700">{transaction.sumupTransactionCode}</span>,
    }] : []),
    ...(transaction.issuedInvoice ? [{
      label: 'Faktura',
      value: (
        <Link
          href={`/invoices/issued?highlight=${transaction.issuedInvoice.id}`}
          className="font-mono text-indigo-600 hover:underline flex items-center gap-0.5"
        >
          {transaction.issuedInvoice.invoiceNumber}
          <ExternalLink className="w-3 h-3" />
        </Link>
      ),
    }] : []),
    ...(transaction.deliveryNote?.customerOrder ? [{
      label: 'Objednávka',
      value: (
        <Link
          href={`/customer-orders/${transaction.deliveryNote.customerOrder.id}`}
          className="font-mono text-indigo-600 hover:underline flex items-center gap-0.5"
        >
          {transaction.deliveryNote.customerOrder.orderNumber}
          <ExternalLink className="w-3 h-3" />
        </Link>
      ),
    }] : []),
    {
      label: 'Typ platby',
      value: transaction.paymentType === 'card' ? 'Karta' : 'Hotovost',
    },
    { label: 'Položek', value: transaction.items.filter(i => i.productId !== null).length },
  ]

  return (
    <ERPDetailPageLayout
      breadcrumbs={breadcrumbs}
      title={transaction.transactionCode}
      subtitle={mapped.customerName ?? undefined}
      statusBadge={<TransactionStatusBadge status={transaction.status} />}
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
          <StatusTimelineCard entries={buildTimeline(transaction)} statusConfig={STATUS_CONFIG} />
          <DocumentOverviewCard rows={overviewRows} />
        </div>
      }
    >
      {transaction.receiptId && <SumUpReceiptLink receiptId={transaction.receiptId} />}

      <CustomerContactSection name={mapped.customerName} />

      {isStorno && <StornoSection stornoAt={transaction.transactionDate} stornoReason="Stornováno" />}

      <OrderItemsSection order={mapped} isVatPayer={isVatPayer} title="Položky transakce" />
    </ERPDetailPageLayout>
  )
}
