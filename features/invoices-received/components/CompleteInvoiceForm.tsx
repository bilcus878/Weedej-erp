'use client'

import { AlertTriangle, FileText, Loader2, ShieldCheck, X } from 'lucide-react'
import { useCompleteInvoiceForm } from '../hooks/useCompleteInvoiceForm'
import type { ReceivedInvoice, OrderItem } from '../types'

// ── formatting helpers ────────────────────────────────────────────────────────

function fmt(n: number) {
  return `${n.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`
}

// ── shared primitives ────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 shrink-0 w-10">{label}</span>
      <span className="font-medium text-gray-700">{value}</span>
    </div>
  )
}

const inp =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-0 focus:border-transparent bg-white'

// ── supplier resolution ───────────────────────────────────────────────────────

function resolveSupplier(inv: ReceivedInvoice) {
  const po = inv.purchaseOrder as any
  return {
    name:        inv.supplierName          || po?.supplierName          || po?.supplier?.name        || '—',
    entityType:  inv.supplierEntityType    || po?.supplierEntityType    || 'company',
    address:     inv.supplierAddress       || po?.supplierAddress       || po?.supplier?.address,
    ico:         inv.supplierIco           || po?.supplierICO           || po?.supplier?.ico,
    dic:         inv.supplierDic           || po?.supplierDIC           || po?.supplier?.dic,
    bankAccount: inv.supplierBankAccount   || po?.supplierBankAccount   || po?.supplier?.bankAccount,
    email:       inv.supplierEmail         || po?.supplierEmail         || po?.supplier?.email,
    phone:       inv.supplierPhone         || po?.supplierPhone         || po?.supplier?.phone,
    contact:     inv.supplierContactPerson || po?.supplierContactPerson || po?.supplier?.contact,
  }
}

// ── main component ────────────────────────────────────────────────────────────

interface Props {
  invoice:    ReceivedInvoice | null
  open:       boolean
  onClose:    () => void
  onSuccess:  () => Promise<void>
  isVatPayer: boolean
}

export function CompleteInvoiceForm({ invoice, open, onClose, onSuccess, isVatPayer }: Props) {
  const form = useCompleteInvoiceForm(
    invoice,
    async () => { await onSuccess(); onClose() }
  )

  if (!open || !invoice) return null

  const po       = invoice.purchaseOrder
  const supplier = resolveSupplier(invoice)
  const items    = (po?.items ?? []) as OrderItem[]

  // Compute per-line VAT data for the read-only table
  const lineData = items.map(item => {
    const qty   = Number(item.quantity)
    const price = Number(item.expectedPrice)
    const rate  = Number(item.vatRate ?? (isVatPayer ? 21 : 0))
    const base  = qty * price
    const vat   = base * (rate / 100)
    return {
      name:  item.product?.name || item.productName || '—',
      qty, unit: item.unit, price, rate,
      base, vat, total: base + vat,
    }
  })

  const totalBase = lineData.reduce((s, l) => s + l.base, 0)
  const totalVat  = lineData.reduce((s, l) => s + l.vat, 0)
  const totalAmt  = Number(invoice.totalAmount)
  const disc      = Number(invoice.discountAmount ?? 0)
  const isBankTransfer = form.formData.paymentType !== '' && form.formData.paymentType !== 'cash'

  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1400px] flex flex-col">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 leading-tight">Doplnit fakturu</h2>
              {po && (
                <p className="text-sm text-gray-500">
                  Objednávka{' '}
                  <span className="font-medium text-gray-700">#{po.orderNumber}</span>
                </p>
              )}
            </div>

            {invoice.isTemporary ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" />
                Dočasná — čeká na doplnění
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
                Potvrzená
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="ml-2 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Provisional warning banner */}
          {invoice.isTemporary && (
            <div className="bg-orange-50 border-b border-orange-100 px-6 py-2.5 flex items-center gap-2 text-sm text-orange-700 shrink-0">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Tato faktura je dočasná a čeká na přiřazení reálného čísla od dodavatele.
                Vyplňte fakturační údaje a potvrďte.
              </span>
            </div>
          )}

          {/* ── Body ──────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-[1fr_380px] min-h-0 flex-1">

            {/* Left column — read-only order data */}
            <div className="border-r border-gray-100 overflow-y-auto p-6 space-y-6">

              {/* Supplier */}
              <section>
                <SectionLabel>Dodavatel</SectionLabel>
                <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                  <p className="text-base font-semibold text-gray-900 mb-2">{supplier.name}</p>
                  {supplier.address && (
                    <p className="text-sm text-gray-600 mb-2">{supplier.address}</p>
                  )}
                  <ReadOnlyField label="IČO"   value={supplier.ico} />
                  <ReadOnlyField label="DIČ"   value={supplier.dic} />
                  <ReadOnlyField label="Účet"  value={supplier.bankAccount} />
                  <ReadOnlyField label="Email" value={supplier.email} />
                  <ReadOnlyField label="Tel"   value={supplier.phone} />
                  {supplier.contact && (
                    <ReadOnlyField label="Kont." value={supplier.contact} />
                  )}
                </div>
              </section>

              {/* Items table — fully read-only */}
              <section>
                <SectionLabel>Položky objednávky</SectionLabel>
                {items.length === 0 ? (
                  <p className="text-sm text-gray-400 italic px-1">
                    Žádné položky — objednávka není připojena k faktuře
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Produkt
                          </th>
                          <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Množství
                          </th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Jedn.
                          </th>
                          <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Nák. cena/ks
                          </th>
                          {isVatPayer && (
                            <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              DPH %
                            </th>
                          )}
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Celkem
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineData.map((line, i) => (
                          <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                            <td className="px-4 py-3 text-gray-800 font-medium">{line.name}</td>
                            <td className="px-3 py-3 text-right text-gray-700">
                              {line.qty.toLocaleString('cs-CZ')}
                            </td>
                            <td className="px-3 py-3 text-gray-500">{line.unit}</td>
                            <td className="px-3 py-3 text-right text-gray-700">{fmt(line.price)}</td>
                            {isVatPayer && (
                              <td className="px-3 py-3 text-right text-gray-500">{line.rate} %</td>
                            )}
                            <td className="px-4 py-3 text-right font-semibold text-gray-800">
                              {isVatPayer ? fmt(line.total) : fmt(line.base)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Totals */}
              <section>
                <SectionLabel>Souhrn</SectionLabel>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 max-w-sm ml-auto">
                  {isVatPayer && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Základ bez DPH:</span>
                        <span className="font-medium text-gray-800">{fmt(totalBase)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">DPH celkem:</span>
                        <span className="font-medium text-gray-800">{fmt(totalVat)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Celkem s DPH:</span>
                        <span className="font-medium text-gray-800">{fmt(totalBase + totalVat)}</span>
                      </div>
                    </>
                  )}
                  {disc > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Sleva dodavatele:</span>
                      <span className="font-medium">− {fmt(disc)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-semibold text-gray-800 text-sm">Celkem k úhradě:</span>
                    <span className="font-bold text-gray-900">{fmt(totalAmt)}</span>
                  </div>
                </div>
              </section>

            </div>

            {/* Right column — editable invoice fields */}
            <div className="overflow-y-auto flex flex-col bg-gray-50/30">
              <form
                id="complete-invoice-form"
                onSubmit={form.handleSubmit}
                className="flex flex-col gap-5 p-6 flex-1"
              >
                <SectionLabel>Fakturační údaje</SectionLabel>

                {/* Invoice number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Číslo faktury od dodavatele
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    className={inp}
                    value={form.formData.invoiceNumber}
                    onChange={e => form.handleFieldChange('invoiceNumber', e.target.value)}
                    placeholder="FAK-2025-001"
                    required
                  />
                  {invoice.isTemporary && (
                    <p className="mt-1 text-xs text-gray-400">
                      Dočasné č.: <span className="font-mono">{invoice.invoiceNumber}</span>
                    </p>
                  )}
                </div>

                {/* Invoice date + due date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Datum vystavení
                      <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <input
                      type="date"
                      className={inp}
                      value={form.formData.invoiceDate}
                      onChange={e => form.handleFieldChange('invoiceDate', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Datum splatnosti
                    </label>
                    <input
                      type="date"
                      className={inp}
                      value={form.formData.dueDate}
                      onChange={e => form.handleFieldChange('dueDate', e.target.value)}
                    />
                  </div>
                </div>

                {/* Payment type — card toggle buttons */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Forma úhrady
                  </label>
                  <div className="flex gap-3">
                    {(['cash', 'bank_transfer'] as const).map(type => {
                      const selected = form.formData.paymentType === type
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => form.handleFieldChange('paymentType', type)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                            selected
                              ? 'border-amber-400 bg-amber-50 text-amber-700'
                              : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                          }`}
                        >
                          {selected && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          )}
                          {type === 'cash' ? 'Hotovost' : 'Bankovní převod'}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Banking symbols — only for bank transfer */}
                {isBankTransfer && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Variabilní symbol
                      </label>
                      <input
                        className={inp}
                        value={form.formData.variableSymbol}
                        onChange={e => form.handleFieldChange('variableSymbol', e.target.value)}
                        placeholder="VS"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Konstantní symbol
                      </label>
                      <input
                        className={inp}
                        value={form.formData.constantSymbol}
                        onChange={e => form.handleFieldChange('constantSymbol', e.target.value)}
                        placeholder="KS"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Specifický symbol
                      </label>
                      <input
                        className={inp}
                        value={form.formData.specificSymbol}
                        onChange={e => form.handleFieldChange('specificSymbol', e.target.value)}
                        placeholder="SS"
                      />
                    </div>
                  </div>
                )}

                {/* Internal accounting note */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interní poznámka
                  </label>
                  <textarea
                    className={`${inp} min-h-[80px] resize-none`}
                    value={form.formData.note}
                    onChange={e => form.handleFieldChange('note', e.target.value)}
                    placeholder="Volitelná účetní poznámka..."
                  />
                </div>

                {/* Spacer pushes footer to bottom */}
                <div className="flex-1" />

                {/* Footer: error + buttons */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  {form.errorMessage && (
                    <p className="text-sm text-red-600 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {form.errorMessage}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      Zrušit
                    </button>
                    <button
                      type="submit"
                      disabled={form.isSubmitting}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {form.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      {invoice.isTemporary ? 'Potvrdit fakturu' : 'Uložit změny'}
                    </button>
                  </div>
                </div>

              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
