'use client'

import React, { useState, useEffect, type MutableRefObject } from 'react'
import { Package, Plus, Trash2, User, CreditCard, Calendar, Banknote, Landmark, CheckCircle, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { VAT_RATE_LABELS, isNonVatPayer, calculateLineVat, calculateVatSummary } from '@/lib/vatCalculation'
import { useCreatePurchaseOrderForm } from '../hooks/useCreatePurchaseOrderForm'
import { CascadingProductDropdown } from '@/components/CascadingProductDropdown'
import { PurchaseOrderTotalsPreview } from './PurchaseOrderTotalsPreview'
import type { Supplier, PurchaseOrderItem, Product } from '../types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  suppliers:    Supplier[]
  products:     Product[]
  isVatPayer:   boolean
  onSuccess:    () => Promise<void>
  openRef?:     MutableRefObject<() => void>
  hideTrigger?: boolean
}

const inp = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-100 focus:outline-none bg-white transition-colors'

const PAYMENT_LABELS: Record<string, string> = {
  cash:          'Hotovost',
  bank_transfer: 'Bankovní převod',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreatePurchaseOrderForm({ suppliers, products, isVatPayer, onSuccess, openRef, hideTrigger }: Props) {
  const form = useCreatePurchaseOrderForm(products, isVatPayer, onSuccess)
  if (openRef) openRef.current = form.handleOpen

  const [supplierTab,    setSupplierTab]    = useState<'list' | 'manual' | 'anonymous'>('list')
  const [supplierSearch, setSupplierSearch] = useState('')

  useEffect(() => {
    if (!form.open) {
      setSupplierTab('list')
      setSupplierSearch('')
    }
  }, [form.open])

  // Derived
  const filteredSuppliers = suppliers.filter(s => {
    const q = supplierSearch.toLowerCase()
    return !q || s.name.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.ico?.includes(q)
  })
  const selectedSupplier = suppliers.find(s => s.id === form.supplierId)

  const sidebarName  = form.isAnonymousSupplier ? 'Anonymní dodavatel'
    : form.isManualSupplier ? (form.manualSupplierData.name || '—')
    : (selectedSupplier?.name || '—')
  const sidebarEmail = form.isManualSupplier ? form.manualSupplierData.email : selectedSupplier?.email
  const sidebarPhone = form.isManualSupplier ? form.manualSupplierData.phone : selectedSupplier?.phone

  const sidebarTotal = (() => {
    const itemTotal = isVatPayer
      ? calculateVatSummary(form.items.map(i => calculateLineVat(i.quantity || 0, i.expectedPrice || 0, i.vatRate))).totalWithVat
      : form.items.reduce((s, i) => s + (i.quantity || 0) * (i.expectedPrice || 0), 0)
    const disc = form.discountType === 'percentage' && form.discountValue
      ? itemTotal * parseFloat(form.discountValue) / 100
      : form.discountType === 'fixed' && form.discountValue ? parseFloat(form.discountValue) : 0
    return itemTotal - disc
  })()

  // Handlers
  function handleSetSupplierTab(tab: 'list' | 'manual' | 'anonymous') {
    setSupplierTab(tab)
    if (tab === 'list') {
      form.setIsManualSupplier(false); form.setIsAnonymousSupplier(false)
    } else if (tab === 'manual') {
      form.setSupplierId(''); form.setIsManualSupplier(true); form.setIsAnonymousSupplier(false)
    } else {
      form.setSupplierId(''); form.setIsManualSupplier(false); form.setIsAnonymousSupplier(true)
    }
  }

  function handleSelectSupplier(s: Supplier) {
    form.setSupplierId(s.id)
  }

  return (
    <>
      {!hideTrigger && (
        <button
          onClick={() => form.open ? form.handleClose() : form.handleOpen()}
          title={form.open ? 'Zavřít formulář' : 'Nová objednávka dodavateli'}
          className={`w-7 h-7 flex items-center justify-center rounded font-bold text-base transition-colors ${
            form.open ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
          }`}
        >
          +
        </button>
      )}

      {form.open && (
        <div className="fixed inset-0 bg-black/60 flex items-stretch justify-center z-50 p-0 sm:p-4 overflow-y-auto">
          <div className="bg-gray-50 rounded-none sm:rounded-xl shadow-2xl w-full max-w-[1440px] sm:my-4 flex flex-col sm:max-h-[calc(100vh-2rem)] overflow-hidden">

            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200 shrink-0">
              <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Nová objednávka dodavateli</h2>
                <p className="text-sm text-gray-400">Dodavatel · položky · termíny · platba</p>
              </div>
              {form.orderNumber && (
                <span className="ml-4 text-xs font-mono bg-orange-100 text-orange-700 px-2.5 py-1 rounded font-semibold">
                  #{form.orderNumber}
                </span>
              )}
              <button type="button" onClick={form.handleClose}
                className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xl leading-none">
                ×
              </button>
            </div>

            {/* 2-column body */}
            <form onSubmit={form.handleSubmit} className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[7fr_3fr] overflow-hidden">

              {/* ════ LEFT ════ */}
              <div className="flex flex-col overflow-y-auto min-h-0 bg-white border-r border-gray-200">
                <div className="flex-1 px-6 py-6 space-y-8">

                  {/* 1. Dodavatel */}
                  <section>
                    <SectionLabel required>Dodavatel</SectionLabel>

                    {/* Tabs */}
                    <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
                      {(['list', 'manual', 'anonymous'] as const).map(tab => (
                        <button key={tab} type="button" onClick={() => handleSetSupplierTab(tab)}
                          className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-colors
                            ${supplierTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                          {tab === 'list' ? 'Ze seznamu' : tab === 'manual' ? 'Zadat ručně' : 'Anonymní'}
                        </button>
                      ))}
                    </div>

                    {/* Ze seznamu */}
                    {supplierTab === 'list' && (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="text" placeholder="Hledat dodavatele…" value={supplierSearch}
                            onChange={e => setSupplierSearch(e.target.value)} className={`${inp} pl-9`} />
                        </div>
                        <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                          {filteredSuppliers.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-gray-400 italic">Žádní dodavatelé</p>
                          ) : filteredSuppliers.map(s => (
                            <button key={s.id} type="button" onClick={() => handleSelectSupplier(s)}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                                ${form.supplierId === s.id ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                                ${form.supplierId === s.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                {s.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                                {(s.email || s.phone || s.ico) && (
                                  <p className="text-xs text-gray-400 truncate">{s.email ?? s.phone ?? s.ico}</p>
                                )}
                              </div>
                              {form.supplierId === s.id && (
                                <span className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center shrink-0">
                                  <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 text-white" fill="none">
                                    <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Zadat ručně */}
                    {supplierTab === 'manual' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Název firmy / Jméno <span className="text-red-400">*</span></label>
                          <input value={form.manualSupplierData.name}
                            onChange={e => form.setManualSupplierData(p => ({ ...p, name: e.target.value }))}
                            placeholder="Dodavatel s.r.o." className={inp} required />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Kontaktní osoba</label>
                          <input value={form.manualSupplierData.contactPerson}
                            onChange={e => form.setManualSupplierData(p => ({ ...p, contactPerson: e.target.value }))}
                            placeholder="Jan Novák" className={inp} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">E-mail</label>
                          <input type="email" value={form.manualSupplierData.email}
                            onChange={e => form.setManualSupplierData(p => ({ ...p, email: e.target.value }))}
                            placeholder="info@dodavatel.cz" className={inp} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Telefon</label>
                          <input type="tel" value={form.manualSupplierData.phone}
                            onChange={e => form.setManualSupplierData(p => ({ ...p, phone: e.target.value }))}
                            placeholder="+420 …" className={inp} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Web</label>
                          <input value={form.manualSupplierData.website}
                            onChange={e => form.setManualSupplierData(p => ({ ...p, website: e.target.value }))}
                            placeholder="www.dodavatel.cz" className={inp} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">IČO</label>
                          <input value={form.manualSupplierData.ico}
                            onChange={e => form.setManualSupplierData(p => ({ ...p, ico: e.target.value }))}
                            placeholder="12345678" maxLength={12} className={inp} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">DIČ</label>
                          <input value={form.manualSupplierData.dic}
                            onChange={e => form.setManualSupplierData(p => ({ ...p, dic: e.target.value }))}
                            placeholder="CZ12345678" className={inp} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Číslo účtu</label>
                          <input value={form.manualSupplierData.bankAccount}
                            onChange={e => form.setManualSupplierData(p => ({ ...p, bankAccount: e.target.value }))}
                            placeholder="1234567890/0100" className={inp} />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Adresa</label>
                          <input value={form.manualSupplierData.address}
                            onChange={e => form.setManualSupplierData(p => ({ ...p, address: e.target.value }))}
                            placeholder="Ulice a č.p., Město, PSČ" className={inp} />
                        </div>
                        <div className="col-span-2">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input type="checkbox" checked={form.saveSupplierToDatabase}
                              onChange={e => form.setSaveSupplierToDatabase(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400" />
                            <span className="text-xs text-gray-500">Uložit dodavatele do databáze pro příští použití</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Anonymní */}
                    {supplierTab === 'anonymous' && (
                      <div className="flex flex-col items-center gap-3 py-6 px-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                          <User className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">Anonymní dodavatel</p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            Dodavatel není evidován v systému.<br />
                            Objednávka bude uložena bez identifikace dodavatele.
                          </p>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* 2. Termíny + Platební podmínky */}
                  <div className="grid grid-cols-2 gap-8">
                    <section>
                      <SectionLabel>Termíny</SectionLabel>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Datum objednávky</label>
                        <input type="date" value={form.orderDate}
                          onChange={e => form.handleOrderDateChange(e.target.value)} className={inp} />
                        <p className="mt-1 text-xs text-gray-400">Číslo objednávky se odvíjí od data</p>
                      </div>
                      <div className="mt-3">
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                          Očekávané dodání <span className="font-normal text-gray-300">(volitelné)</span>
                        </label>
                        <input type="date" value={form.expectedDate}
                          onChange={e => form.setExpectedDate(e.target.value)} className={inp} />
                      </div>
                    </section>
                    <section>
                      <SectionLabel>
                        Platební podmínky <span className="normal-case font-normal text-gray-300 text-xs">(volitelné)</span>
                      </SectionLabel>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Datum splatnosti</label>
                        <input type="date" value={form.dueDate}
                          onChange={e => form.setDueDate(e.target.value)} className={inp} />
                      </div>
                      <div className="flex flex-col gap-2 mt-3">
                        {([
                          { value: 'cash',          label: 'Hotovost',        Icon: Banknote, desc: 'Platba v hotovosti'       },
                          { value: 'bank_transfer',  label: 'Bankovní převod', Icon: Landmark, desc: 'Převod na bankovní účet' },
                        ] as const).map(({ value, label, Icon, desc }) => {
                          const isSelected = form.paymentType === value
                          return (
                            <button key={value} type="button"
                              onClick={() => form.setPaymentType(isSelected ? '' : value)}
                              className={`flex items-center gap-3 px-4 py-3 border rounded-xl text-left transition-all
                                ${isSelected ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                                ${isSelected ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1">
                                <p className={`text-sm font-semibold ${isSelected ? 'text-orange-700' : 'text-gray-800'}`}>{label}</p>
                                <p className="text-xs text-gray-400">{desc}</p>
                              </div>
                              {isSelected && <CheckCircle className="w-4 h-4 text-orange-500 shrink-0" />}
                            </button>
                          )
                        })}
                      </div>
                      {form.paymentType === 'bank_transfer' && (
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">VS</label>
                            <input value={form.variableSymbol} onChange={e => form.setVariableSymbol(e.target.value)}
                              placeholder={form.orderNumber} className={inp} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">KS</label>
                            <input value={form.constantSymbol} onChange={e => form.setConstantSymbol(e.target.value)}
                              placeholder="0308" className={inp} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">SS</label>
                            <input value={form.specificSymbol} onChange={e => form.setSpecificSymbol(e.target.value)} className={inp} />
                          </div>
                        </div>
                      )}
                    </section>
                  </div>

                  {/* 3. Položky objednávky */}
                  <section>
                    <SectionLabel required>Položky objednávky</SectionLabel>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[600px]">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                              <th className="text-left px-4 py-3">Produkt</th>
                              <th className="text-center px-3 py-3 w-24">Množství</th>
                              <th className="text-center px-3 py-3 w-16">Jedn.</th>
                              {isVatPayer && <th className="text-center px-3 py-3 w-16">DPH</th>}
                              <th className="text-center px-3 py-3 w-32">Nák. cena/ks</th>
                              <th className="text-center px-3 py-3 w-28">Celkem</th>
                              <th className="w-10" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {form.items.length === 0 && (
                              <tr>
                                <td colSpan={isVatPayer ? 7 : 6} className="px-4 py-8 text-center text-sm text-gray-400 italic">
                                  Žádné položky — klikněte „+ Přidat položku" níže
                                </td>
                              </tr>
                            )}
                            {form.items.map((item, index) => (
                              <PurchaseItemRow
                                key={index}
                                item={item}
                                index={index}
                                products={products}
                                isVatPayer={isVatPayer}
                                onItemChange={form.handleItemChange}
                                onRemove={form.handleRemoveItem}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <button type="button" onClick={form.handleAddItem}
                      className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Přidat položku
                    </button>

                    <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                        <label className="text-xs font-semibold text-gray-500 shrink-0">Sleva</label>
                        <select value={form.discountType} onChange={e => form.setDiscountType(e.target.value as 'percentage' | 'fixed' | 'none')}
                          className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
                          <option value="none">Bez slevy</option>
                          <option value="percentage">Procenta (%)</option>
                          <option value="fixed">Částka (Kč)</option>
                        </select>
                        <input type="number" step="0.01" min="0"
                          max={form.discountType === 'percentage' ? '100' : undefined}
                          value={form.discountValue}
                          onChange={e => form.setDiscountValue(e.target.value)}
                          placeholder={form.discountType === 'none' ? '—' : form.discountType === 'percentage' ? 'Např. 10' : 'Např. 100'}
                          disabled={form.discountType === 'none'}
                          className="w-32 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                      <PurchaseOrderTotalsPreview
                        items={form.items}
                        isVatPayer={isVatPayer}
                        discountType={form.discountType}
                        discountValue={form.discountValue}
                      />
                    </div>
                  </section>

                  {/* 4. Poznámka */}
                  <section>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                      Poznámka <span className="normal-case font-normal text-gray-300">(volitelné)</span>
                    </label>
                    <textarea value={form.note} onChange={e => form.setNote(e.target.value)}
                      placeholder="Interní poznámka k objednávce…" rows={3}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-100 focus:outline-none bg-white resize-none transition-colors placeholder:text-gray-300" />
                  </section>

                </div>

                {/* Sticky footer */}
                <div className="border-t border-gray-200 px-6 py-4 bg-white flex items-center justify-between gap-4 shrink-0">
                  <button type="button" onClick={form.handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
                    Zrušit
                  </button>
                  <button type="submit"
                    className="flex items-center gap-2 px-7 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all">
                    <Package className="w-4 h-4" /> Vytvořit objednávku
                  </button>
                </div>
              </div>

              {/* ════ RIGHT sidebar ════ */}
              <div className="hidden lg:flex flex-col gap-3 p-4 overflow-y-auto bg-gray-50 min-h-0">
                <SideCard icon={User} title="Dodavatel">
                  <p className="font-semibold text-gray-900 leading-snug">{sidebarName}</p>
                  {sidebarEmail && <p className="text-xs text-gray-500 mt-1">{sidebarEmail}</p>}
                  {sidebarPhone && <p className="text-xs text-gray-500">{sidebarPhone}</p>}
                  {sidebarName === '—' && <p className="text-xs text-gray-400 italic">Dodavatel nevybrán</p>}
                </SideCard>

                <SideCard icon={Calendar} title="Termíny">
                  <div className="space-y-1.5">
                    <SideRow label="Objednávka" value={form.orderDate ? new Date(form.orderDate).toLocaleDateString('cs-CZ') : '—'} />
                    <SideRow label="Dodání"     value={form.expectedDate ? new Date(form.expectedDate).toLocaleDateString('cs-CZ') : '—'} />
                    {form.dueDate && (
                      <SideRow label="Splatnost" value={new Date(form.dueDate).toLocaleDateString('cs-CZ')} />
                    )}
                  </div>
                </SideCard>

                <SideCard icon={CreditCard} title="Souhrn">
                  <div className="space-y-2.5 text-sm">
                    <SideRow label="Číslo"   value={form.orderNumber ? `#${form.orderNumber}` : '—'} mono />
                    <SideRow label="Datum"   value={form.orderDate ? new Date(form.orderDate).toLocaleDateString('cs-CZ') : '—'} />
                    <SideRow label="Platba"  value={form.paymentType ? (PAYMENT_LABELS[form.paymentType] || form.paymentType) : '—'} />
                    <hr className="border-gray-100" />
                    <SideRow label="Položky" value={`${form.items.length} ks`} />
                    <hr className="border-gray-100" />
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Celkem</span>
                      <span className="font-bold text-gray-900 text-lg">
                        {sidebarTotal.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč
                      </span>
                    </div>
                  </div>
                </SideCard>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
      {children}{required && <span className="text-red-400 ml-1 normal-case font-normal">*</span>}
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

function PurchaseItemRow({ item, index, products, isVatPayer, onItemChange, onRemove }: {
  item:         PurchaseOrderItem
  index:        number
  products:     Product[]
  isVatPayer:   boolean
  onItemChange: (index: number, field: string, value: unknown) => void
  onRemove:     (index: number) => void
}) {
  const total = isVatPayer && !isNonVatPayer(item.vatRate)
    ? calculateLineVat(item.quantity || 0, item.expectedPrice || 0, item.vatRate).totalWithVat
    : (item.quantity || 0) * (item.expectedPrice || 0)

  const cell = 'px-3 py-2.5 align-middle'
  const inp2 = 'w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:border-orange-300 focus:ring-1 focus:ring-orange-100 focus:outline-none bg-white transition-colors text-center'

  return (
    <tr className="hover:bg-gray-50/60 transition-colors">
      <td className="px-4 py-2 align-middle">
        {item.isManual ? (
          <div className="flex items-center gap-2">
            <input
              value={item.productName || ''}
              onChange={e => onItemChange(index, 'productName', e.target.value)}
              placeholder="Název položky…"
              className="flex-1 px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:border-orange-300 focus:ring-1 focus:ring-orange-100 focus:outline-none bg-white transition-colors"
            />
            <button type="button" onClick={() => onItemChange(index, 'isManual', false)}
              title="Vybrat ze seznamu produktů"
              className="shrink-0 text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded px-2 py-1 bg-white hover:bg-gray-50 transition-colors whitespace-nowrap">
              Ze seznamu
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <CascadingProductDropdown
                products={products}
                value={item.productId || ''}
                onChange={productId => onItemChange(index, 'productId', productId)}
              />
            </div>
            <button type="button" onClick={() => onItemChange(index, 'isManual', true)}
              title="Zadat název ručně"
              className="shrink-0 text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded px-2 py-1 bg-white hover:bg-gray-50 transition-colors whitespace-nowrap">
              Ručně
            </button>
          </div>
        )}
      </td>
      <td className={cell}>
        <input type="number" step="1" min="0" value={item.quantity || ''} placeholder="0"
          onChange={e => onItemChange(index, 'quantity', e.target.value === '' ? '' : parseFloat(e.target.value))}
          className={inp2} />
      </td>
      <td className={cell}>
        <input value={item.unit} onChange={e => onItemChange(index, 'unit', e.target.value)}
          placeholder="ks" className={inp2} />
      </td>
      {isVatPayer && (
        <td className={cell}>
          <div className={`px-2 py-2 border rounded-lg text-xs text-center ${
            isNonVatPayer(item.vatRate)
              ? 'bg-gray-50 text-gray-400 border-gray-200'
              : 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
          }`}>
            {isNonVatPayer(item.vatRate) ? '—' : (VAT_RATE_LABELS[item.vatRate] || `${item.vatRate}%`)}
          </div>
        </td>
      )}
      <td className={cell}>
        <input type="number" step="0.01" min="0" value={item.expectedPrice || ''} placeholder="0"
          onChange={e => onItemChange(index, 'expectedPrice', e.target.value === '' ? '' : parseFloat(e.target.value))}
          className={inp2} />
      </td>
      <td className={cell}>
        <div className="px-2.5 py-2 border border-gray-100 rounded-lg text-sm text-center font-semibold bg-gray-50 text-gray-900 whitespace-nowrap">
          {total.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč
        </div>
      </td>
      <td className="px-2 py-2 align-middle">
        <button type="button" onClick={() => onRemove(index)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  )
}
