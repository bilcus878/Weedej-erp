'use client'

import { useEffect }  from 'react'
import { useRouter }  from 'next/navigation'
import Link           from 'next/link'
import { RefreshCw, Printer, XCircle, ExternalLink } from 'lucide-react'
import { ERPDetailPageLayout } from '@/components/erp/detail'
import {
  CustomerContactSection,
  OrderSummarySection,
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
  useDeliveryNoteDetail,
  DeliveryNoteStatusBadge,
  mapDeliveryNoteToOrderDetail,
  stornoDeliveryNote,
} from '@/features/delivery-notes'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<string, { label: string; color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'orange' }> = {
  delivered: { label: 'Vydáno', color: 'green' },
  storno:    { label: 'STORNO', color: 'red'   },
}

function buildTimeline(deliveryDate: string, processedAt?: string, stornoAt?: string | null): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    { toStatus: 'delivered', changedAt: deliveryDate, statusLabel: 'Výdejka vytvořena' },
  ]
  if (processedAt) entries.push({ toStatus: 'delivered', changedAt: processedAt, statusLabel: 'Zpracováno' })
  if (stornoAt)    entries.push({ toStatus: 'storno',    changedAt: stornoAt,    statusLabel: 'STORNO'     })
  return entries.sort((a, b) => new Date(a.changedAt as string).getTime() - new Date(b.changedAt as string).getTime())
}

const BASE_CRUMBS = [{ label: 'Výdejky', href: '/delivery-notes' }]

export default function DeliveryNoteDetailPage({ params }: { params: { id: string } }) {
  const router  = useRouter()
  const { note, loading, error, refresh } = useDeliveryNoteDetail(params.id)
  const { isVatPayer } = useCompanySettings()
  const { setMeta } = useNavbarMeta()

  useEffect(() => {
    if (note) setMeta({ subTitle: note.deliveryNumber, pageTitleOnClick: () => router.push('/delivery-notes') })
  }, [note?.deliveryNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  const breadcrumbs = [...BASE_CRUMBS, { label: note?.deliveryNumber ?? '…' }]

  if (error === 'not_found') return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Výdejka nenalezena" notFound />
  if (error)            return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Chyba" error={error} />
  if (loading || !note) return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Načítání…" isLoading />

  const mapped      = mapDeliveryNoteToOrderDetail(note, isVatPayer)
  const isStorno    = note.status === 'storno'
  const orderHref   = note.customerOrder
    ? `/${note.customerOrder.orderNumber?.startsWith('ESH') ? 'eshop-orders' : 'customer-orders'}/${note.customerOrder.id}`
    : undefined

  async function handleStorno() {
    const reason = prompt(`Opravdu chceš stornovat výdejku ${note!.deliveryNumber}?\n\nZadej důvod storna (povinné):`)
    if (!reason || reason.trim().length === 0) return
    try {
      await stornoDeliveryNote(note!.id, reason)
      await refresh()
    } catch (e: any) {
      alert(e.message ?? 'Chyba při stornování')
    }
  }

  const actions = [
    {
      label:   'Tisk / PDF',
      icon:    <Printer />,
      variant: 'secondary' as const,
      onClick: () => window.open(`/api/delivery-notes/${note.id}/pdf`, '_blank'),
    },
    {
      label:   'Stornovat',
      icon:    <XCircle />,
      variant: 'danger' as const,
      onClick: handleStorno,
      hidden:  isStorno,
    },
  ]

  const overviewRows = [
    {
      label: 'Číslo výdejky',
      value: <span className="font-mono text-indigo-600">{note.deliveryNumber}</span>,
    },
    ...(orderHref && note.customerOrder ? [{
      label: 'Objednávka',
      value: (
        <Link href={orderHref} className="font-mono text-indigo-600 hover:underline flex items-center gap-0.5">
          {note.customerOrder.orderNumber}
          <ExternalLink className="w-3 h-3" />
        </Link>
      ),
    }] : []),
    ...(mapped.issuedInvoice ? [{
      label: 'Faktura',
      value: (
        <Link
          href={`/invoices/issued?highlight=${mapped.issuedInvoice.id}`}
          className="font-mono text-indigo-600 hover:underline flex items-center gap-0.5"
        >
          {mapped.issuedInvoice.invoiceNumber}
          <ExternalLink className="w-3 h-3" />
        </Link>
      ),
    }] : []),
    { label: 'Položek', value: note.items.filter(i => i.productId != null).length },
  ]

  return (
    <ERPDetailPageLayout
      breadcrumbs={breadcrumbs}
      title={note.deliveryNumber}
      subtitle={mapped.customerName ?? undefined}
      statusBadge={<DeliveryNoteStatusBadge status={note.status} />}
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
            entries={buildTimeline(note.deliveryDate, note.processedAt, isStorno ? note.deliveryDate : null)}
            statusConfig={STATUS_CONFIG}
          />
          <DocumentOverviewCard rows={overviewRows} />
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CustomerContactSection
          name={mapped.customerName}
          email={mapped.customerEmail}
          phone={mapped.customerPhone}
          company={mapped.billingCompany}
          ico={mapped.billingIco}
          billingName={mapped.billingName}
          billingCompany={mapped.billingCompany}
          billingStreet={mapped.billingStreet}
          billingCity={mapped.billingCity}
          billingZip={mapped.billingZip}
          billingCountry={mapped.billingCountry}
        />
        <OrderSummarySection order={mapped} isVatPayer={isVatPayer} title="Souhrn výdejky" />
      </div>

      {isStorno && <StornoSection stornoAt={note.deliveryDate} stornoReason="Stornováno" />}

      {note.note && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-50 border-b border-gray-200">Poznámka</h4>
          <div className="px-4 py-3 text-sm text-gray-700">{note.note}</div>
        </div>
      )}

      <OrderItemsSection order={mapped} isVatPayer={isVatPayer} title="Vydané položky" />
    </ERPDetailPageLayout>
  )
}
