'use client'

import { useEffect, useState }  from 'react'
import { useRouter }             from 'next/navigation'
import Link                      from 'next/link'
import { RefreshCw, Printer, XCircle, FileText, ExternalLink } from 'lucide-react'
import { ERPDetailPageLayout }   from '@/components/erp/detail'
import {
  CustomerContactSection,
  OrderSummarySection,
  ShippingSection,
  StornoSection,
  OrderItemsSection,
  DocumentActionsCard,
  StatusTimelineCard,
  DocumentOverviewCard,
} from '@/components/erp/detail'
import type { TimelineEntry } from '@/components/erp/detail'
import { useNavbarMeta }         from '@/components/erp/navbar/NavbarMetaContext'
import { useCompanySettings }    from '@/components/erp/hooks/useCompanySettings'
import {
  useIssuedInvoiceDetail,
  useInvoiceActions,
  useCreditNotes,
  StatusBadge,
  CreditNotesList,
  CreditNoteModal,
  mapInvoiceToOrderDetail,
} from '@/features/issued-invoices'
import type { IssuedInvoice, CreditNoteFormItem } from '@/features/issued-invoices'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<string, { label: string; color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'orange' }> = {
  new:        { label: 'Nová',           color: 'yellow' },
  paid:       { label: 'Zaplacená',      color: 'blue'   },
  processing: { label: 'Připravuje se',  color: 'orange' },
  shipped:    { label: 'Odesláno',       color: 'green'  },
  delivered:  { label: 'Předáno',        color: 'green'  },
  cancelled:  { label: 'Zrušená',        color: 'red'    },
  storno:     { label: 'STORNO',         color: 'red'    },
}

function buildTimeline(invoice: IssuedInvoice): TimelineEntry[] {
  const mapped = mapInvoiceToOrderDetail(invoice)
  const entries: TimelineEntry[] = [
    { toStatus: invoice.status, changedAt: invoice.transactionDate, statusLabel: STATUS_CONFIG[invoice.status]?.label ?? invoice.status },
  ]
  if (mapped.paidAt && invoice.transactionDate !== mapped.paidAt) {
    entries.push({ toStatus: 'paid', changedAt: mapped.paidAt, statusLabel: 'Zaplaceno' })
  }
  if (mapped.shippedAt) {
    entries.push({ toStatus: 'shipped', changedAt: mapped.shippedAt, statusLabel: 'Odesláno' })
  }
  if (invoice.status === 'storno') {
    entries.push({ toStatus: 'storno', changedAt: invoice.transactionDate, statusLabel: 'STORNO' })
  }
  return [...new Map(entries.map(e => [e.changedAt, e])).values()]
    .sort((a, b) => new Date(a.changedAt as string).getTime() - new Date(b.changedAt as string).getTime())
}

const BASE_CRUMBS = [{ label: 'Vystavené faktury', href: '/invoices/issued' }]

export default function IssuedInvoiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { invoice, loading, error, refresh } = useIssuedInvoiceDetail(params.id)
  const { isVatPayer }    = useCompanySettings()
  const { handleStorno, handlePrintPDF } = useInvoiceActions(refresh)
  const { setMeta } = useNavbarMeta()

  const [creditNoteModalInvoice, setCreditNoteModalInvoice] = useState<IssuedInvoice | null>(null)

  // Credit notes for this invoice
  const expandedSet = invoice ? new Set([invoice.id]) : new Set<string>()
  const { creditNotesMap, loadCreditNotes, submitCreditNote } = useCreditNotes(expandedSet, invoice?.id)

  useEffect(() => {
    if (invoice) {
      setMeta({ subTitle: invoice.transactionCode, pageTitleOnClick: () => router.push('/invoices/issued') })
      loadCreditNotes(invoice.id)
    }
  }, [invoice?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const breadcrumbs = [...BASE_CRUMBS, { label: invoice?.transactionCode ?? '…' }]

  if (error === 'not_found') return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Faktura nenalezena" notFound />
  if (error)               return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Chyba" error={error} />
  if (loading || !invoice) return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Načítání…" isLoading />

  const mapped      = mapInvoiceToOrderDetail(invoice)
  const isStorno    = invoice.status === 'storno'
  const hasShipping = !!(invoice.shippingMethod || invoice.pickupPointId)
  const creditNotes = creditNotesMap[invoice.id] || []

  async function handleSubmitCreditNote(items: CreditNoteFormItem[], reason: string, note: string) {
    if (!creditNoteModalInvoice) return
    try {
      const number = await submitCreditNote(creditNoteModalInvoice, items, reason, note)
      alert(`Dobropis ${number} byl úspěšně vytvořen!`)
      setCreditNoteModalInvoice(null)
      await refresh()
    } catch (e) {
      alert(e instanceof Error ? `Chyba při vytváření dobropisu: ${e.message}` : 'Nepodařilo se vytvořit dobropis')
    }
  }

  const actions = [
    {
      label:   'Tisk / PDF',
      icon:    <Printer />,
      variant: 'secondary' as const,
      onClick: () => handlePrintPDF(invoice),
    },
    {
      label:   'Vytvořit dobropis',
      icon:    <FileText />,
      variant: 'secondary' as const,
      onClick: () => setCreditNoteModalInvoice(invoice),
      hidden:  isStorno,
    },
    {
      label:   'Stornovat',
      icon:    <XCircle />,
      variant: 'danger' as const,
      onClick: () => handleStorno(invoice),
      hidden:  isStorno,
    },
  ]

  const overviewRows = [
    {
      label: 'Číslo faktury',
      value: <span className="font-mono text-indigo-600">{invoice.transactionCode}</span>,
    },
    ...(invoice.customerOrderId ? [{
      label: 'Objednávka',
      value: (
        <Link
          href={`/${invoice.customerOrderSource === 'eshop' ? 'eshop-orders' : 'customer-orders'}/${invoice.customerOrderId}`}
          className="font-mono text-indigo-600 hover:underline flex items-center gap-0.5"
        >
          {invoice.customerOrderNumber || 'Zobrazit'}
          <ExternalLink className="w-3 h-3" />
        </Link>
      ),
    }] : []),
    ...(invoice.variableSymbol ? [{
      label: 'Variabilní symbol',
      value: <span className="font-mono">{invoice.variableSymbol}</span>,
    }] : []),
    { label: 'Typ platby',  value: invoice.paymentType === 'cash' ? 'Hotovost' : invoice.paymentType === 'card' ? 'Karta' : 'Převod' },
    { label: 'Položek',     value: invoice.items.filter(i => i.productId !== null).length },
    ...(creditNotes.length > 0 ? [{
      label: 'Dobropisy',
      value: creditNotes.length,
    }] : []),
  ]

  return (
    <>
      <ERPDetailPageLayout
        breadcrumbs={breadcrumbs}
        title={invoice.transactionCode}
        subtitle={mapped.customerName ?? undefined}
        statusBadge={<StatusBadge status={invoice.status} />}
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
            <StatusTimelineCard entries={buildTimeline(invoice)} statusConfig={STATUS_CONFIG} />
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
          <OrderSummarySection order={mapped} isVatPayer={isVatPayer} title="Souhrn faktury" />
        </div>

        {hasShipping && <ShippingSection order={mapped} onRefresh={refresh} />}

        {isStorno && <StornoSection stornoAt={mapped.stornoAt} stornoReason={mapped.stornoReason} />}

        <OrderItemsSection order={mapped} isVatPayer={isVatPayer} title="Fakturované položky" />

        {creditNotes.length > 0 && <CreditNotesList creditNotes={creditNotes} />}
      </ERPDetailPageLayout>

      {creditNoteModalInvoice && (
        <CreditNoteModal
          invoice={creditNoteModalInvoice}
          onSubmit={handleSubmitCreditNote}
          onClose={() => setCreditNoteModalInvoice(null)}
        />
      )}
    </>
  )
}
