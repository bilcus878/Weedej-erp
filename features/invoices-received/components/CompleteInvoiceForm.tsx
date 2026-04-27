'use client'

import { AlertTriangle, Banknote, Calendar, CheckCircle, CreditCard, FileText, Landmark, Loader2, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useCompleteInvoiceForm } from '../hooks/useCompleteInvoiceForm'
import type { ReceivedInvoice, OrderItem } from '../types'

// ── formatting ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `${n.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`
}

function fmtDate(s?: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('cs-CZ')
}

// ── primitives (matching CreatePurchaseOrderForm exactly) ─────────────────────

const inp = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-100 focus:outline-none bg-white transition-colors'

const PAYMENT_LABELS: Record<string, string> = {
  cash:          'Hotovost',
  bank_transfer: 'Bankovní převod',
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
      {children}
    </p>
  )
}

function SideCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <Icon className="w-4 h-4 text-gray-300" />
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</span>
      </div>
      <div className="px-4 py-4 text-sm">{children}</div>
    </div>
  )
}

function SideRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className={`text-gray-700 text-right ${mono ? 'font-mono font-semibold' : ''}`}>{value}</span>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5 text-sm">
      <span className="text-gray-400 shrink-0">{label}:</span>
      <span className="text-gray-700 font-medium">{value}</span>
    </div>
  )
}

function TotalsRow({ label, value, bold, red, indent }: {
  label: string; value: string; bold?: boolean; red?: boolean; indent?: boolean
}) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'pt-2 border-t border-gray-200' : ''} ${indent ? 'pl-4' : ''}`}>
      <span className={bold ? 'font-semibold text-gray-800' : red ? 'text-red-600' : 'text-gray-600'}>
        {label}
      </span>
      <span className={bold ? 'font-bold text-gray-900 text-base' : red ? 'font-medium text-red-600' : 'font-medium text-gray-900'}>
        {value}
      </span>
    </div>
  )
}

// ── supplier resolution ───────────────────────────────────────────────────────

function resolveSupplier(inv: ReceivedInvoice) {
  const po = inv.purchaseOrder as any
  return {
    name:        inv.supplierName          || po?.supplierName          || po?.supplier?.name        || '—',
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
  const form = useCompleteInvoiceForm(invoice, async () => { await onSuccess(); onClose() })

  if (!open || !invoice) return null

  const po       = invoice.purchaseOrder
  const supplier = resolveSupplier(invoice)
  const items    = (po?.items ?? []) as OrderItem[]

  const lineData = items.map(item => {
    const qty   = Number(item.quantity)
    const price = Number(item.expectedPrice)
    const rate  = Number(item.vatRate ?? (isVatPayer ? 21 : 0))
    const base  = qty * price
    const vat   = base * (rate / 100)
    return { name: item.product?.name || item.productName || '—', qty, unit: item.unit, price, rate, base, vat, total: base + vat }
  })

  const totalBase      = lineData.reduce((s, l) => s + l.base, 0)
  const totalVat       = lineData.reduce((s, l) => s + l.vat, 0)
  const totalAmt       = Number(invoice.totalAmount)
  const disc           = Number(invoice.discountAmount ?? 0)
  const isBankTransfer = form.formData.paymentType === 'bank_transfer'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-stretch justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      <div className="bg-gray-50 rounded-none sm:rounded-xl shadow-2xl w-full max-w-[1440px] sm:my-4 flex flex-col sm:max-h-[calc(100vh-2rem)] overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Doplnit fakturu</h2>
            <p className="text-sm text-gray-400">
              {supplier.name !== '—' ? supplier.name : 'Přijatá faktura'}
              {' · '}
              {invoice.isTemporary ? 'Dočasná · čeká na doplnění' : 'Potvrzená faktura'}
            </p>
          </div>
          {po && (
            <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2.5 py-1 rounded font-semibold">
              OBJ #{po.orderNumber}
            </span>
          )}
          {invoice.isTemporary ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold bg-orange-100 text-orange-700 px-2.5 py-1 rounded">
              <AlertTriangle className="w-3 h-3" />
              Dočasná
            </span>
          ) : (
            <span className="text-xs font-mono bg-orange-100 text-orange-700 px-2.5 py-1 rounded font-semibold">
              #{invoice.invoiceNumber}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* ── 2-column body ──────────────────────────────────────────────────── */}
        <form
          onSubmit={form.handleSubmit}
          className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[7fr_3fr] overflow-hidden"
        >

          {/* ════ LEFT ════ */}
          <div className="flex flex-col overflow-y-auto min-h-0 bg-white border-r border-gray-200">
            <div className="flex-1 px-6 py-6 space-y-8">

              {/* 1. Dodavatel */}
              <section>
                <SectionLabel>Dodavatel</SectionLabel>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-base font-semibold text-gray-900 mb-2">{supplier.name}</p>
                  {supplier.address && (
                    <p className="text-sm text-gray-500 mb-3">{supplier.address}</p>
                  )}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                    {supplier.ico         && <InfoRow label="IČO"     value={supplier.ico} />}
                    {supplier.dic         && <InfoRow label="DIČ"     value={supplier.dic} />}
                    {supplier.email       && <InfoRow label="Email"   value={supplier.email} />}
                    {supplier.phone       && <InfoRow label="Tel"     value={supplier.phone} />}
                    {supplier.bankAccount && <InfoRow label="Účet"    value={supplier.bankAccount} />}
                    {supplier.contact     && <InfoRow label="Kontakt" value={supplier.contact} />}
                  </div>
                </div>
              </section>

              {/* 2. Fakturační údaje + Platební podmínky — 2-col grid matching PO Termíny/Platba layout */}
              <div className="grid grid-cols-2 gap-8">
                <section>
                  <SectionLabel>Fakturační údaje</SectionLabel>

                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                      Číslo faktury od dodavatele <span className="text-red-400">*</span>
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

                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                      Datum vystavení <span className="text-red-400">*</span>
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
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                      Datum splatnosti <span className="font-normal text-gray-300">(volitelné)</span>
                    </label>
                    <input
                      type="date"
                      className={inp}
                      value={form.formData.dueDate}
                      onChange={e => form.handleFieldChange('dueDate', e.target.value)}
                    />
                  </div>
                </section>

                <section>
                  <SectionLabel>
                    Platební podmínky <span className="normal-case font-normal text-gray-300">(volitelné)</span>
                  </SectionLabel>

                  <div className="flex flex-col gap-2">
                    {([
                      { value: 'cash',          label: 'Hotovost',        Icon: Banknote, desc: 'Platba v hotovosti'       },
                      { value: 'bank_transfer',  label: 'Bankovní převod', Icon: Landmark, desc: 'Převod na bankovní účet' },
                    ] as const).map(({ value, label, Icon, desc }) => {
                      const isSelected = form.formData.paymentType === value
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => form.handleFieldChange('paymentType', isSelected ? '' : value)}
                          className={`flex items-center gap-3 px-4 py-3 border rounded-xl text-left transition-all ${
                            isSelected ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${isSelected ? 'text-orange-700' : 'text-gray-800'}`}>{label}</p>
                            <p className="text-xs text-gray-400">{desc}</p>
                          </div>
                          {isSelected && <CheckCircle className="w-4 h-4 text-orange-500 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>

                  {isBankTransfer && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">VS</label>
                        <input
                          className={inp}
                          value={form.formData.variableSymbol}
                          onChange={e => form.handleFieldChange('variableSymbol', e.target.value)}
                          placeholder={form.formData.invoiceNumber || 'VS'}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">KS</label>
                        <input
                          className={inp}
                          value={form.formData.constantSymbol}
                          onChange={e => form.handleFieldChange('constantSymbol', e.target.value)}
                          placeholder="0308"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">SS</label>
                        <input
                          className={inp}
                          value={form.formData.specificSymbol}
                          onChange={e => form.handleFieldChange('specificSymbol', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </section>
              </div>

              {/* 3. Položky objednávky — table + integrated totals */}
              <section>
                <SectionLabel>Položky objednávky</SectionLabel>
                {items.length === 0 ? (
                  <p className="text-sm text-gray-400 italic px-1">
                    Žádné položky — objednávka není připojena k faktuře
                  </p>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[500px]">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                            <th className="text-left px-4 py-3">Produkt</th>
                            <th className="text-center px-3 py-3 w-24">Množství</th>
                            <th className="text-center px-3 py-3 w-16">Jedn.</th>
                            <th className="text-center px-3 py-3 w-32">Nák. cena/ks</th>
                            {isVatPayer && <th className="text-center px-3 py-3 w-16">DPH %</th>}
                            <th className="text-center px-3 py-3 w-28">Celkem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {lineData.map((line, i) => (
                            <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-800">{line.name}</td>
                              <td className="px-3 py-3 text-center text-gray-700">{line.qty.toLocaleString('cs-CZ')}</td>
                              <td className="px-3 py-3 text-center text-gray-500">{line.unit}</td>
                              <td className="px-3 py-3 text-center text-gray-700">{fmt(line.price)}</td>
                              {isVatPayer && (
                                <td className="px-3 py-3 text-center text-gray-500">{line.rate} %</td>
                              )}
                              <td className="px-3 py-3 text-center font-semibold text-gray-800">
                                {isVatPayer ? fmt(line.total) : fmt(line.base)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Integrated totals — matching PurchaseOrderTotalsPreview style */}
                    <div className="border-t border-gray-200 bg-gray-50/60 p-4 space-y-2">
                      {isVatPayer && (
                        <>
                          <TotalsRow label="Základ bez DPH:" value={fmt(totalBase)} />
                          <TotalsRow label={`DPH celkem:`}   value={fmt(totalVat)} indent />
                          <TotalsRow label="Celkem s DPH:"   value={fmt(totalBase + totalVat)} />
                        </>
                      )}
                      {disc > 0 && (
                        <TotalsRow label="Sleva dodavatele:" value={`− ${fmt(disc)}`} red />
                      )}
                      <TotalsRow label="Celkem k úhradě:" value={fmt(totalAmt)} bold />
                    </div>
                  </div>
                )}
              </section>

              {/* 4. Interní poznámka */}
              <section>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                  Interní poznámka <span className="normal-case font-normal text-gray-300">(volitelné)</span>
                </label>
                <textarea
                  value={form.formData.note}
                  onChange={e => form.handleFieldChange('note', e.target.value)}
                  placeholder="Účetní nebo interní poznámka k faktuře…"
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-100 focus:outline-none bg-white resize-none transition-colors placeholder:text-gray-300"
                />
              </section>

            </div>

            {/* Sticky footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-white flex items-center justify-between gap-4 shrink-0">
              {form.errorMessage ? (
                <p className="text-sm text-red-600 flex items-center gap-1.5 min-w-0">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="truncate">{form.errorMessage}</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Zrušit
                </button>
              )}
              <button
                type="submit"
                disabled={form.isSubmitting}
                className="flex items-center gap-2 px-7 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
              >
                {form.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {invoice.isTemporary ? 'Potvrdit fakturu' : 'Uložit změny'}
              </button>
            </div>
          </div>

          {/* ════ RIGHT sidebar ════ */}
          <div className="hidden lg:flex flex-col gap-3 p-4 overflow-y-auto bg-gray-50 min-h-0">

            <SideCard icon={User} title="Dodavatel">
              <p className="font-semibold text-gray-900 leading-snug">{supplier.name}</p>
              {supplier.email && <p className="text-xs text-gray-500 mt-1">{supplier.email}</p>}
              {supplier.phone && <p className="text-xs text-gray-500">{supplier.phone}</p>}
              {supplier.name === '—' && <p className="text-xs text-gray-400 italic">Dodavatel neznámý</p>}
            </SideCard>

            <SideCard icon={Calendar} title="Termíny">
              <div className="space-y-1.5">
                <SideRow label="Faktura"    value={fmtDate(form.formData.invoiceDate || invoice.invoiceDate)} />
                <SideRow label="Splatnost"  value={fmtDate(form.formData.dueDate || invoice.dueDate)} />
                {po?.orderDate    && <SideRow label="Objednávka" value={fmtDate(po.orderDate)} />}
                {po?.expectedDate && <SideRow label="Dodání"     value={fmtDate(po.expectedDate)} />}
              </div>
            </SideCard>

            <SideCard icon={CreditCard} title="Souhrn">
              <div className="space-y-2.5 text-sm">
                <SideRow
                  label="Číslo"
                  value={form.formData.invoiceNumber || '—'}
                  mono
                />
                <SideRow
                  label="Platba"
                  value={form.formData.paymentType ? (PAYMENT_LABELS[form.formData.paymentType] ?? form.formData.paymentType) : '—'}
                />
                <hr className="border-gray-100" />
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Celkem</span>
                  <span className="font-bold text-gray-900 text-lg">{fmt(totalAmt)}</span>
                </div>
              </div>
            </SideCard>

          </div>

        </form>
      </div>
    </div>
  )
}
