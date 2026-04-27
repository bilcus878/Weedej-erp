'use client'

import React, { useRef, useState, useEffect, type MutableRefObject } from 'react'
import { ShoppingCart, Plus, Trash2, MapPin, Package, User, CreditCard, Truck, Search, Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { VAT_RATE_LABELS, isNonVatPayer, calculateLineVat, calculateVatSummary } from '@/lib/vatCalculation'
import { useCreateOrderForm } from '../hooks/useCreateOrderForm'
import { CascadingProductDropdown } from '@/components/CascadingProductDropdown'
import { OrderTotalsPreview } from './OrderTotalsPreview'
import type { BillingAddress, Customer, CustomerOrderItem, Product } from '../types'

// ─── Config ───────────────────────────────────────────────────────────────────

const SHIPPING_OPTIONS = [
  { value: 'DPD_HOME',          label: 'DPD — Na adresu',                    price: 99  },
  { value: 'DPD_PICKUP',        label: 'DPD — Výdejní místo',                price: 79  },
  { value: 'ZASILKOVNA_HOME',   label: 'Zásilkovna — Na adresu',             price: 89  },
  { value: 'ZASILKOVNA_PICKUP', label: 'Zásilkovna — Výdejní místo / Z-BOX', price: 69  },
  { value: 'COURIER',           label: 'Kurýr',                               price: 150 },
  { value: 'PICKUP_IN_STORE',   label: 'Osobní odběr',                       price: 0   },
]

const CARRIER_CONFIG = [
  { id: 'DPD',             label: 'DPD',          Icon: Truck,   priceLabel: 'od 79 Kč', hasTypes: true  },
  { id: 'ZASILKOVNA',      label: 'Zásilkovna',   Icon: Package, priceLabel: 'od 69 Kč', hasTypes: true  },
  { id: 'COURIER',         label: 'Kurýr',        Icon: Truck,   priceLabel: '150 Kč',   hasTypes: false },
  { id: 'PICKUP_IN_STORE', label: 'Osobní odběr', Icon: MapPin,  priceLabel: 'zdarma',   hasTypes: false },
]

const COUNTRY_OPTIONS = [
  { value: 'CZ', label: 'Česká republika' },
  { value: 'SK', label: 'Slovensko' },
  { value: 'DE', label: 'Německo' },
  { value: 'AT', label: 'Rakousko' },
  { value: 'PL', label: 'Polsko' },
]

const PAYMENT_LABELS: Record<string, string> = {
  card: 'Platební karta', cash: 'Hotovost', transfer: 'Bankovní převod',
  bank_transfer: 'Bankovní převod', online: 'Online platba',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  customers:    Customer[]
  products:     Product[]
  isVatPayer:   boolean
  onSuccess:    () => Promise<void>
  openRef?:     MutableRefObject<() => void>
  hideTrigger?: boolean
}

const inp = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-100 focus:outline-none bg-white transition-colors'

// ─── Packeta inline widget ────────────────────────────────────────────────────

interface PickupPoint { id: string; name: string; nameStreet: string; city: string; zip: string }

function PacketaWidget({ onSelect, selected }: { onSelect: (p: PickupPoint) => void; selected: PickupPoint | null }) {
  const apiKey = process.env.NEXT_PUBLIC_PACKETA_API_KEY ?? ''
  const [ready, setReady]   = useState(false)
  const [open,  setOpen]    = useState(false)
  const containerRef        = useRef<HTMLDivElement>(null)
  const cbRef               = useRef(onSelect)
  useEffect(() => { cbRef.current = onSelect }, [onSelect])

  useEffect(() => {
    const w = window as any
    if (w.Packeta?.Widget) { setReady(true); return }
    const ID = 'packeta-widget-js'
    if (document.getElementById(ID)) {
      const t = setInterval(() => { if (w.Packeta?.Widget) { setReady(true); clearInterval(t) } }, 100)
      return () => clearInterval(t)
    }
    const s = document.createElement('script')
    s.id = ID; s.src = 'https://widget.packeta.com/v6/www/js/library.js'; s.async = true
    s.onload = () => setReady(true)
    document.body.appendChild(s)
  }, [])

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      let d: any
      try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data } catch { return }
      if (!d?.packetaWidgetMessage) return
      setOpen(false)
      const p = d.packetaPoint
      if (!p) return
      cbRef.current({ id: String(p.id), name: String(p.place ?? p.name), nameStreet: String(p.nameStreet ?? p.street ?? ''), city: String(p.city ?? ''), zip: String(p.zip ?? '') })
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  useEffect(() => {
    if (!open || !containerRef.current) return
    const w = window as any
    if (!w.Packeta?.Widget) return
    const t = setTimeout(() => {
      w.Packeta.Widget.pick(apiKey, { country: 'cz', language: 'cs' }, (raw: any) => {
        setOpen(false)
        if (!raw) return
        cbRef.current({ id: String(raw.id), name: String(raw.place ?? raw.name), nameStreet: String(raw.nameStreet ?? raw.street ?? ''), city: String(raw.city ?? ''), zip: String(raw.zip ?? '') })
      }, containerRef.current)
    }, 150)
    return () => clearTimeout(t)
  }, [open, apiKey])

  if (open) return (
    <div>
      <div ref={containerRef} className="rounded-xl border border-gray-200 overflow-hidden" style={{ width: '100%', height: 480 }} />
      <button type="button" onClick={() => { (window as any).Packeta?.Widget?.close?.(); setOpen(false) }}
        className="w-full mt-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
        Zrušit
      </button>
    </div>
  )

  if (selected) return (
    <div className="flex items-start justify-between gap-3 p-3 border border-orange-200 bg-orange-50 rounded-xl">
      <div className="flex items-start gap-2.5">
        <MapPin className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-900">{selected.name}</p>
          {selected.nameStreet && <p className="text-xs text-gray-500">{selected.nameStreet}</p>}
          <p className="text-xs text-gray-400">{selected.zip} {selected.city}</p>
        </div>
      </div>
      <button type="button" onClick={() => setOpen(true)} disabled={!apiKey}
        className="shrink-0 text-xs font-medium text-orange-600 hover:text-orange-800 border border-orange-200 rounded-lg px-2.5 py-1.5 bg-white transition-colors">
        Změnit
      </button>
    </div>
  )

  return (
    <button type="button" onClick={() => setOpen(true)} disabled={!apiKey || !ready}
      className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-orange-300 hover:text-orange-600 disabled:opacity-50 transition-colors">
      {!ready
        ? <><Loader2 className="w-4 h-4 animate-spin" /> Načítám mapu…</>
        : <><MapPin className="w-4 h-4" /> Vybrat výdejní místo Zásilkovny</>}
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateCustomerOrderForm({ customers, products, isVatPayer, onSuccess, openRef, hideTrigger }: Props) {
  const form = useCreateOrderForm(products, isVatPayer, onSuccess)
  if (openRef) openRef.current = form.handleOpen

  const [customerTab,     setCustomerTab]     = useState<'list' | 'manual' | 'anonymous'>('list')
  const [customerSearch,  setCustomerSearch]  = useState('')
  const [shippingCarrier, setShippingCarrier] = useState('')
  const [shippingType,    setShippingType]    = useState<'HOME' | 'PICKUP' | ''>('')
  const [packetaPoint,    setPacketaPoint]    = useState<PickupPoint | null>(null)

  useEffect(() => {
    if (!form.open) {
      setCustomerTab('list'); setCustomerSearch('')
      setShippingCarrier(''); setShippingType(''); setPacketaPoint(null)
    }
  }, [form.open])

  // Derived
  const shippingOption    = SHIPPING_OPTIONS.find(o => o.value === form.shippingMethod)
  const shippingCost      = shippingOption?.price ?? 0
  const isPickup          = form.shippingMethod === 'DPD_PICKUP' || form.shippingMethod === 'ZASILKOVNA_PICKUP'
  const filteredCustomers = customers.filter(c => {
    const q = customerSearch.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.ico?.includes(q)
  })
  const selectedCustomer = customers.find(c => c.id === form.customerId)
  const sidebarName  = form.isAnonymousCustomer ? 'Anonymní zákazník'
    : form.isManualCustomer ? (form.manualCustomerData.name || '—')
    : (selectedCustomer?.name || '—')
  const sidebarEmail = form.isManualCustomer ? form.manualCustomerData.email : selectedCustomer?.email
  const sidebarPhone = form.isManualCustomer ? form.manualCustomerData.phone : selectedCustomer?.phone
  const sidebarTotal = (() => {
    const itemTotal = isVatPayer
      ? calculateVatSummary(form.items.map(i => calculateLineVat(i.quantity || 0, i.price || 0, i.vatRate))).totalWithVat
      : form.items.reduce((s, i) => s + (i.quantity || 0) * (i.price || 0), 0)
    const disc = form.discountType === 'percentage' && form.discountValue
      ? itemTotal * parseFloat(form.discountValue) / 100
      : form.discountType === 'fixed' && form.discountValue ? parseFloat(form.discountValue) : 0
    return itemTotal - disc + shippingCost
  })()

  // Handlers
  function handleSetCustomerTab(tab: 'list' | 'manual' | 'anonymous') {
    setCustomerTab(tab)
    if (tab === 'list') {
      form.setIsManualCustomer(false); form.setIsAnonymousCustomer(false)
    } else if (tab === 'manual') {
      form.setCustomerId(''); form.setIsManualCustomer(true); form.setIsAnonymousCustomer(false)
    } else {
      form.setCustomerId(''); form.setIsManualCustomer(false); form.setIsAnonymousCustomer(true)
      setShippingCarrier('PICKUP_IN_STORE'); setShippingType('')
      form.setShippingMethod('PICKUP_IN_STORE')
      form.setPickupPointId(''); form.setPickupPointName(''); form.setPickupPointAddress('')
      if (form.paymentType === 'card' || form.paymentType === 'online') form.setPaymentType('')
    }
  }

  function handleSelectCustomer(c: Customer) {
    form.setCustomerId(c.id); form.setCustomerName(c.name)
    form.setCustomerEmail(c.email ?? ''); form.setCustomerPhone(c.phone ?? '')
  }

  function handleSelectCarrier(carrierId: string) {
    setShippingCarrier(carrierId); setShippingType(''); setPacketaPoint(null)
    form.setPickupPointId(''); form.setPickupPointName(''); form.setPickupPointAddress('')
    if (carrierId === 'COURIER')          form.setShippingMethod('COURIER')
    else if (carrierId === 'PICKUP_IN_STORE') form.setShippingMethod('PICKUP_IN_STORE')
    else form.setShippingMethod('')
  }

  function handleSelectShippingType(type: 'HOME' | 'PICKUP') {
    setShippingType(type); setPacketaPoint(null)
    form.setPickupPointId(''); form.setPickupPointName(''); form.setPickupPointAddress('')
    form.setShippingMethod(`${shippingCarrier}_${type}`)
  }

  function handlePacketaSelect(point: PickupPoint) {
    setPacketaPoint(point)
    form.setPickupPointId(point.id); form.setPickupPointName(point.name)
    form.setPickupPointAddress([point.nameStreet, `${point.zip} ${point.city}`.trim()].filter(Boolean).join(', '))
  }

  return (
    <>
      {!hideTrigger && (
        <button
          onClick={() => form.open ? form.handleClose() : form.handleOpen()}
          title={form.open ? 'Zavřít formulář' : 'Nová zákaznická objednávka'}
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
                <ShoppingCart className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Nová zákaznická objednávka</h2>
                <p className="text-sm text-gray-400">Zákazník · položky · doručení · platba</p>
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

                  {/* 1. Zákazník */}
                  <section>
                    <SectionLabel required>Zákazník</SectionLabel>

                    {/* Tabs */}
                    <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
                      {(['list', 'manual', 'anonymous'] as const).map(tab => (
                        <button key={tab} type="button" onClick={() => handleSetCustomerTab(tab)}
                          className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-colors
                            ${customerTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                          {tab === 'list' ? 'Ze seznamu' : tab === 'manual' ? 'Zadat ručně' : 'Anonymní'}
                        </button>
                      ))}
                    </div>

                    {/* Ze seznamu */}
                    {customerTab === 'list' && (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="text" placeholder="Hledat zákazníka…" value={customerSearch}
                            onChange={e => setCustomerSearch(e.target.value)} className={`${inp} pl-9`} />
                        </div>
                        <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                          {filteredCustomers.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-gray-400 italic">Žádní zákazníci</p>
                          ) : filteredCustomers.map(c => (
                            <button key={c.id} type="button" onClick={() => handleSelectCustomer(c)}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                                ${form.customerId === c.id ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                                ${form.customerId === c.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                {c.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                                {(c.email || c.phone) && (
                                  <p className="text-xs text-gray-400 truncate">{c.email ?? c.phone}</p>
                                )}
                              </div>
                              {form.customerId === c.id && (
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
                    {customerTab === 'manual' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Jméno / Název firmy <span className="text-red-400">*</span></label>
                          <input value={form.manualCustomerData.name}
                            onChange={e => form.setManualCustomerData(p => ({ ...p, name: e.target.value }))}
                            placeholder="Jan Novák / Firma s.r.o." className={inp} required />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">E-mail</label>
                          <input type="email" value={form.manualCustomerData.email}
                            onChange={e => form.setManualCustomerData(p => ({ ...p, email: e.target.value }))}
                            placeholder="jan@firma.cz" className={inp} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Telefon</label>
                          <input type="tel" value={form.manualCustomerData.phone}
                            onChange={e => form.setManualCustomerData(p => ({ ...p, phone: e.target.value }))}
                            placeholder="+420 …" className={inp} />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Adresa <span className="text-red-400">*</span></label>
                          <input value={form.manualCustomerData.address}
                            onChange={e => form.setManualCustomerData(p => ({ ...p, address: e.target.value }))}
                            placeholder="Ulice a č.p., Město, PSČ" className={inp} required />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">IČO</label>
                          <input value={form.manualCustomerData.ico}
                            onChange={e => form.setManualCustomerData(p => ({ ...p, ico: e.target.value }))}
                            placeholder="12345678" maxLength={12} className={inp} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">DIČ</label>
                          <input value={form.manualCustomerData.dic}
                            onChange={e => form.setManualCustomerData(p => ({ ...p, dic: e.target.value }))}
                            placeholder="CZ12345678" className={inp} />
                        </div>
                        <div className="col-span-2">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input type="checkbox" checked={form.saveCustomerToDatabase}
                              onChange={e => form.setSaveCustomerToDatabase(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400" />
                            <span className="text-xs text-gray-500">Uložit zákazníka do databáze pro příští použití</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Anonymní */}
                    {customerTab === 'anonymous' && (
                      <div className="flex flex-col items-center gap-3 py-6 px-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                          <User className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">Anonymní zákazník</p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            Zákazník není evidován v systému.<br />
                            Dostupné: <strong>Osobní odběr</strong> · platba <strong>Hotovost</strong> nebo <strong>Bankovní převod</strong>
                          </p>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* 2. Datum + Platba */}
                  <div className="grid grid-cols-2 gap-8">
                    <section>
                      <SectionLabel>Datum objednávky</SectionLabel>
                      <input type="date" value={form.orderDate} onChange={e => form.setOrderDate(e.target.value)} className={inp} />
                    </section>
                    <section>
                      <SectionLabel required>Platba</SectionLabel>
                      <div className="space-y-3">
                        <select value={form.paymentType} onChange={e => form.setPaymentType(e.target.value)} className={inp} required>
                          <option value="">— Vyberte formu úhrady —</option>
                          <option value="cash">Hotovost</option>
                          <option value="transfer">Bankovní převod</option>
                          {!form.isAnonymousCustomer && <option value="card">Platební karta</option>}
                          {!form.isAnonymousCustomer && <option value="online">Online platba</option>}
                        </select>
                        <input type="date" value={form.dueDate} onChange={e => form.setDueDate(e.target.value)}
                          title="Datum splatnosti" className={inp} required />
                      </div>
                      {(form.paymentType === 'transfer' || form.paymentType === 'bank_transfer') && (
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

                  {/* 3. Způsob doručení */}
                  <section>
                    <SectionLabel>Způsob doručení</SectionLabel>

                    {/* Step 1 — carrier cards */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {CARRIER_CONFIG.map(({ id, label, Icon, priceLabel }) => {
                        const isSelected = shippingCarrier === id
                        const isDisabled = form.isAnonymousCustomer && id !== 'PICKUP_IN_STORE'
                        return (
                          <button key={id} type="button" disabled={isDisabled}
                            onClick={() => handleSelectCarrier(id)}
                            className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all
                              ${isSelected ? 'border-orange-400 bg-orange-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}
                              ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                              ${isSelected ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{label}</p>
                              <p className="text-xs text-gray-400">{priceLabel}</p>
                            </div>
                            {isSelected && (
                              <span className="absolute right-2.5 top-2.5 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                                <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 text-white" fill="none">
                                  <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* Step 2 — HOME | PICKUP toggle (DPD / Zásilkovna only) */}
                    {(shippingCarrier === 'DPD' || shippingCarrier === 'ZASILKOVNA') && (
                      <div className="mt-4 flex gap-3">
                        {([
                          { type: 'HOME',   label: 'Na adresu',          Icon: Truck,  desc: shippingCarrier === 'DPD' ? '99 Kč' : '89 Kč' },
                          { type: 'PICKUP', label: 'Do výdejního místa', Icon: MapPin, desc: shippingCarrier === 'DPD' ? '79 Kč' : '69 Kč' },
                        ] as const).map(({ type, label, Icon, desc }) => (
                          <button key={type} type="button"
                            onClick={() => handleSelectShippingType(type)}
                            className={`flex-1 flex items-center gap-3 p-3 border rounded-xl text-left transition-all
                              ${shippingType === type ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                              ${shippingType === type ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{label}</p>
                              <p className="text-xs text-gray-400">{desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Step 3 — detail based on selection */}
                    {shippingType === 'HOME' && (
                      <p className="mt-3 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                        Zásilka bude doručena na adresu zákazníka. Adresu zákazníka upravíte v sekci Zákazník výše.
                      </p>
                    )}

                    {shippingType === 'PICKUP' && shippingCarrier === 'ZASILKOVNA' && (
                      <div className="mt-4">
                        <PacketaWidget onSelect={handlePacketaSelect} selected={packetaPoint} />
                      </div>
                    )}

                    {shippingType === 'PICKUP' && shippingCarrier === 'DPD' && (
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">ID výdejního místa</label>
                          <input value={form.pickupPointId} onChange={e => form.setPickupPointId(e.target.value)}
                            placeholder="12345" className={inp} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Název <span className="text-red-400">*</span></label>
                          <input value={form.pickupPointName} onChange={e => form.setPickupPointName(e.target.value)}
                            placeholder="DPD Pickup Praha" required className={inp} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Adresa</label>
                          <input value={form.pickupPointAddress} onChange={e => form.setPickupPointAddress(e.target.value)}
                            placeholder="Ulice, Město" className={inp} />
                        </div>
                      </div>
                    )}

                    {shippingCarrier === 'COURIER' && (
                      <p className="mt-3 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                        Kurýr doručí zásilku na adresu zákazníka · 150 Kč
                      </p>
                    )}

                    {shippingCarrier === 'PICKUP_IN_STORE' && (
                      <p className="mt-3 text-xs text-gray-500 bg-green-50 border border-green-100 rounded-lg px-3 py-2.5">
                        Zákazník si zásilku vyzvedne osobně na provozovně · zdarma
                      </p>
                    )}
                  </section>

                  {/* 4. Fakturační adresa */}
                  <section>
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input type="checkbox" checked={form.hasSeparateBilling}
                        onChange={e => form.setHasSeparateBilling(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400" />
                      <span className="text-xs font-bold uppercase tracking-widest text-gray-400 group-hover:text-gray-600 transition-colors">
                        Fakturační adresa se liší od doručovací
                      </span>
                    </label>
                    {form.hasSeparateBilling && (
                      <div className="mt-4 border-t border-gray-100 pt-4">
                        <BillingAddressFields value={form.billingAddress} onChange={form.setBillingAddress} />
                      </div>
                    )}
                  </section>

                  {/* 5. Položky objednávky */}
                  <section>
                    <SectionLabel required>Položky objednávky</SectionLabel>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[560px]">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                              <th className="text-left px-4 py-3">Produkt</th>
                              <th className="text-center px-3 py-3 w-24">Množství</th>
                              <th className="text-center px-3 py-3 w-16">Jedn.</th>
                              {isVatPayer && <th className="text-center px-3 py-3 w-16">DPH</th>}
                              <th className="text-center px-3 py-3 w-28">Cena/ks</th>
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
                              <ItemRow key={index} item={item} index={index} products={products} isVatPayer={isVatPayer}
                                onItemChange={form.handleItemChange} onRemove={form.handleRemoveItem} />
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
                        <select value={form.discountType} onChange={e => form.setDiscountType(e.target.value as any)}
                          className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
                          <option value="none">Bez slevy</option>
                          <option value="percentage">Procenta (%)</option>
                          <option value="fixed">Částka (Kč)</option>
                        </select>
                        <input type="number" step="0.01" min="0"
                          max={form.discountType === 'percentage' ? '100' : undefined}
                          value={form.discountValue} onChange={e => form.setDiscountValue(e.target.value)}
                          placeholder={form.discountType === 'none' ? '—' : form.discountType === 'percentage' ? 'Např. 10' : 'Např. 100'}
                          disabled={form.discountType === 'none'}
                          className="w-32 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                      <OrderTotalsPreview items={form.items} isVatPayer={isVatPayer}
                        discountType={form.discountType} discountValue={form.discountValue}
                        shippingCost={shippingCost} shippingLabel={shippingOption?.label} />
                    </div>
                  </section>

                  {/* 6. Poznámka */}
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
                    <ShoppingCart className="w-4 h-4" /> Vytvořit objednávku
                  </button>
                </div>
              </div>

              {/* ════ RIGHT sidebar ════ */}
              <div className="hidden lg:flex flex-col gap-3 p-4 overflow-y-auto bg-gray-50 min-h-0">
                <SideCard icon={User} title="Zákazník">
                  <p className="font-semibold text-gray-900 leading-snug">{sidebarName}</p>
                  {sidebarEmail && <p className="text-xs text-gray-500 mt-1">{sidebarEmail}</p>}
                  {sidebarPhone && <p className="text-xs text-gray-500">{sidebarPhone}</p>}
                  {sidebarName === '—' && <p className="text-xs text-gray-400 italic">Zákazník nevybrán</p>}
                </SideCard>

                <SideCard icon={MapPin} title="Doručení">
                  {!form.shippingMethod ? (
                    <p className="text-xs text-gray-400 italic">Způsob doručení nevybrán</p>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="font-medium text-gray-800 leading-snug text-sm">{shippingOption?.label}</p>
                      <p className="text-xs text-gray-500">{shippingCost > 0 ? `${shippingCost} Kč` : 'Zdarma'}</p>
                      {isPickup && form.pickupPointName && (
                        <div className="pt-1.5 border-t border-gray-100">
                          <p className="font-semibold text-gray-900 text-sm">{form.pickupPointName}</p>
                          {form.pickupPointAddress && <p className="text-xs text-gray-500 leading-relaxed">{form.pickupPointAddress}</p>}
                        </div>
                      )}
                    </div>
                  )}
                </SideCard>

                <SideCard icon={CreditCard} title="Souhrn">
                  <div className="space-y-2.5 text-sm">
                    <SideRow label="Číslo"     value={form.orderNumber ? `#${form.orderNumber}` : '—'} mono />
                    <SideRow label="Datum"     value={form.orderDate ? new Date(form.orderDate).toLocaleDateString('cs-CZ') : '—'} />
                    <SideRow label="Platba"    value={form.paymentType ? (PAYMENT_LABELS[form.paymentType] || form.paymentType) : '—'} />
                    <SideRow label="Splatnost" value={form.dueDate ? new Date(form.dueDate).toLocaleDateString('cs-CZ') : '—'} />
                    <hr className="border-gray-100" />
                    <SideRow label="Položky" value={`${form.items.length} ks`} />
                    {shippingCost > 0 && <SideRow label="Doprava" value={`${shippingCost} Kč`} />}
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

function BillingAddressFields({ value, onChange }: {
  value: BillingAddress
  onChange: React.Dispatch<React.SetStateAction<BillingAddress>>
}) {
  const set = (field: keyof BillingAddress) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange(prev => ({ ...prev, [field]: e.target.value }))
  const lbl = 'block text-xs font-semibold text-gray-500 mb-1.5'
  const fi  = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-100 focus:outline-none bg-white transition-colors'
  return (
    <div className="grid grid-cols-4 gap-3">
      <div className="col-span-2"><label className={lbl}>Jméno / Příjemce <span className="text-red-400">*</span></label>
        <input value={value.billingName} onChange={set('billingName')} placeholder="Jan Novák" required className={fi} /></div>
      <div className="col-span-2"><label className={lbl}>Firma</label>
        <input value={value.billingCompany} onChange={set('billingCompany')} placeholder="Název firmy" className={fi} /></div>
      <div><label className={lbl}>IČO</label>
        <input value={value.billingIco} onChange={set('billingIco')} placeholder="12345678" maxLength={12} className={fi} /></div>
      <div><label className={lbl}>DIČ</label>
        <input value={value.billingDic} onChange={set('billingDic')} placeholder="CZ12345678" className={fi} /></div>
      <div className="col-span-2"><label className={lbl}>Ulice a č.p. <span className="text-red-400">*</span></label>
        <input value={value.billingStreet} onChange={set('billingStreet')} placeholder="Ulice a číslo domu" required className={fi} /></div>
      <div><label className={lbl}>Město <span className="text-red-400">*</span></label>
        <input value={value.billingCity} onChange={set('billingCity')} placeholder="Praha" required className={fi} /></div>
      <div><label className={lbl}>PSČ <span className="text-red-400">*</span></label>
        <input value={value.billingZip} onChange={set('billingZip')} placeholder="110 00" maxLength={10} required className={fi} /></div>
      <div className="col-span-2"><label className={lbl}>Země <span className="text-red-400">*</span></label>
        <select value={value.billingCountry} onChange={set('billingCountry')} className={fi} required>
          {COUNTRY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select></div>
    </div>
  )
}

function ItemRow({ item, index, products, isVatPayer, onItemChange, onRemove }: {
  item:         CustomerOrderItem
  index:        number
  products:     Product[]
  isVatPayer:   boolean
  onItemChange: (index: number, field: string, value: unknown) => void
  onRemove:     (index: number) => void
}) {
  const total = isVatPayer && !isNonVatPayer(item.vatRate)
    ? calculateLineVat(item.quantity || 0, item.price || 0, item.vatRate).totalWithVat
    : (item.quantity || 0) * (item.price || 0)
  const cell = 'px-3 py-2.5 align-middle'
  const inp2 = 'w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:border-orange-300 focus:ring-1 focus:ring-orange-100 focus:outline-none bg-white transition-colors text-center'
  return (
    <tr className="hover:bg-gray-50/60 transition-colors">
      <td className="px-4 py-2 align-middle">
        <CascadingProductDropdown products={products} value={item.productId || ''}
          onChange={productId => onItemChange(index, 'productId', productId)} />
      </td>
      <td className={cell}>
        <input type="number" step="1" min="0" value={item.quantity || ''} placeholder="0"
          onChange={e => onItemChange(index, 'quantity', e.target.value === '' ? '' : parseFloat(e.target.value))}
          className={inp2} />
      </td>
      <td className={cell}>
        <input value={item.unit} onChange={e => onItemChange(index, 'unit', e.target.value)} placeholder="ks" className={inp2} />
      </td>
      {isVatPayer && (
        <td className={cell}>
          <div className={`px-2 py-2 border rounded-lg text-xs text-center ${
            isNonVatPayer(item.vatRate) ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
          }`}>
            {isNonVatPayer(item.vatRate) ? '—' : (VAT_RATE_LABELS[item.vatRate] || `${item.vatRate}%`)}
          </div>
        </td>
      )}
      <td className={cell}>
        <input type="number" step="1" min="0" value={item.price || ''} placeholder="0"
          onChange={e => onItemChange(index, 'price', e.target.value === '' ? '' : parseFloat(e.target.value))}
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
