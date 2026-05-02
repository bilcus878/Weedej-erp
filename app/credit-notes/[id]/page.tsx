'use client'

import { useEffect }  from 'react'
import { useRouter }  from 'next/navigation'
import Link           from 'next/link'
import { RefreshCw, XCircle, ExternalLink } from 'lucide-react'
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
  useCreditNoteDetail,
  useCreditNoteActions,
  mapCreditNoteToOrderDetail,
} from '@/features/credit-notes'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<string, { label: string; color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'orange' }> = {
  active: { label: 'Aktivní', color: 'purple' },
  storno: { label: 'STORNO',  color: 'red'    },
  paid:   { label: 'Aktivní', color: 'purple' },
}

function CreditNoteStatusBadge({ status }: { status: string }) {
  if (status === 'storno') {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">STORNO</span>
  }
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Aktivní</span>
}

function buildTimeline(creditNoteDate: string, stornoAt?: string | null): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    { toStatus: 'active', changedAt: creditNoteDate, statusLabel: 'Dobropis vystaven' },
  ]
  if (stornoAt) entries.push({ toStatus: 'storno', changedAt: stornoAt, statusLabel: 'STORNO' })
  return entries.sort((a, b) => new Date(a.changedAt as string).getTime() - new Date(b.changedAt as string).getTime())
}

const BASE_CRUMBS = [{ label: 'Dobropisy', href: '/credit-notes' }]

export default function CreditNoteDetailPage({ params }: { params: { id: string } }) {
  const router  = useRouter()
  const { creditNote, loading, error, refresh } = useCreditNoteDetail(params.id)
  const { isVatPayer } = useCompanySettings()
  const { handleStorno } = useCreditNoteActions(refresh)
  const { setMeta } = useNavbarMeta()

  useEffect(() => {
    if (creditNote) setMeta({ subTitle: creditNote.creditNoteNumber, pageTitleOnClick: () => router.push('/credit-notes') })
  }, [creditNote?.creditNoteNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  const breadcrumbs = [...BASE_CRUMBS, { label: creditNote?.creditNoteNumber ?? '…' }]

  if (error === 'not_found') return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Dobropis nenalezen" notFound />
  if (error)                 return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Chyba" error={error} />
  if (loading || !creditNote) return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Načítání…" isLoading />

  const mapped   = mapCreditNoteToOrderDetail(creditNote)
  const isStorno = creditNote.status === 'storno'

  const actions = [
    {
      label:   'Stornovat',
      icon:    <XCircle />,
      variant: 'danger' as const,
      onClick: () => handleStorno(creditNote),
      hidden:  isStorno,
    },
  ]

  const overviewRows = [
    {
      label: 'Číslo dobropisu',
      value: <span className="font-mono text-indigo-600">{creditNote.creditNoteNumber}</span>,
    },
    {
      label: 'Faktura',
      value: (
        <Link
          href={`/invoices/issued?highlight=${creditNote.issuedInvoiceId}`}
          className="font-mono text-indigo-600 hover:underline flex items-center gap-0.5"
        >
          {creditNote.invoiceNumber}
          <ExternalLink className="w-3 h-3" />
        </Link>
      ),
    },
    ...(creditNote.customerOrderId ? [{
      label: 'Objednávka',
      value: (
        <Link
          href={`/customer-orders/${creditNote.customerOrderId}`}
          className="font-mono text-indigo-600 hover:underline flex items-center gap-0.5"
        >
          {creditNote.customerOrderNumber || 'Zobrazit'}
          <ExternalLink className="w-3 h-3" />
        </Link>
      ),
    }] : []),
    ...((!creditNote.customerOrderId && creditNote.transactionId) ? [{
      label: 'Transakce',
      value: (
        <Link
          href={`/transactions/${creditNote.transactionId}`}
          className="font-mono text-indigo-600 hover:underline flex items-center gap-0.5"
        >
          {creditNote.transactionCode || 'Zobrazit'}
          <ExternalLink className="w-3 h-3" />
        </Link>
      ),
    }] : []),
    { label: 'Položek', value: creditNote.items.length },
  ]

  return (
    <ERPDetailPageLayout
      breadcrumbs={breadcrumbs}
      title={creditNote.creditNoteNumber}
      subtitle={mapped.customerName ?? undefined}
      statusBadge={<CreditNoteStatusBadge status={creditNote.status} />}
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
          <StatusTimelineCard
            entries={buildTimeline(creditNote.creditNoteDate, creditNote.stornoAt)}
            statusConfig={STATUS_CONFIG}
          />
          <DocumentOverviewCard rows={overviewRows} />
        </div>
      }
    >
      <CustomerContactSection
        name={mapped.customerName}
        email={mapped.customerEmail}
        phone={mapped.customerPhone}
        ico={mapped.billingIco}
        billingName={mapped.billingName}
      />

      {(creditNote.reason || creditNote.note) && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-50 border-b border-gray-200">Důvod dobropisu</h4>
          <div className="px-4 py-3 text-sm text-gray-700 space-y-1">
            {creditNote.reason && <p>{creditNote.reason}</p>}
            {creditNote.note   && <p className="text-gray-500">{creditNote.note}</p>}
          </div>
        </div>
      )}

      {isStorno && (
        <StornoSection
          stornoAt={creditNote.stornoAt}
          stornoReason={creditNote.stornoReason}
        />
      )}

      <OrderItemsSection order={mapped} isVatPayer={isVatPayer} title="Položky dobropisu" />
    </ERPDetailPageLayout>
  )
}
