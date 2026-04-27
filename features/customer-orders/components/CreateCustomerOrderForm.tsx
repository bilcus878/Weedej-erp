'use client'

import { ShoppingCart, Plus, Trash2, MapPin, Package, User, CreditCard } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Input from '@/components/ui/Input'
import { VAT_RATE_LABELS, isNonVatPayer, calculateLineVat, calculateVatSummary } from '@/lib/vatCalculation'
import CustomerSupplierSelector from '@/components/CustomerSupplierSelector'
import PaymentDetailsSelector from '@/components/PaymentDetailsSelector'
import { useCreateOrderForm } from '../hooks/useCreateOrderForm'
import { CascadingProductDropdown } from '@/components/CascadingProductDropdown'
import { OrderTotalsPreview } from './OrderTotalsPreview'
import type { MutableRefObject } from 'react'
import type { BillingAddress, Customer, CustomerOrderItem, Product } from '../types'

// ─── Config ───────────────────────────────────────────────────────────────────

// Prices are static defaults; wire to ShippingMethod DB records via /api/shipping-methods when ready
const SHIPPING_OPTIONS = [
  { value: 'DPD_HOME',          label: 'DPD — Doručení na adresu',           price: 99  },
  { value: 'DPD_PICKUP',        label: 'DPD — Výdejní místo',                price: 79  },
  { value: 'ZASILKOVNA_HOME',   label: 'Zásilkovna — Doručení na adresu',    price: 89  },
  { value: 'ZASILKOVNA_PICKUP', label: 'Zásilkovna — Výdejní místo / Z-BOX', price: 69  },
  { value: 'COURIER',           label: 'Kurýr',                               price: 150 },
  { value: 'PICKUP_IN_STORE',   label: 'Osobní odběr',                       price: 0   },
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

// ─── Shared style atoms ───────────────────────────────────────────────────────

const inp = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-100 focus:outline-none bg-white transition-colors'

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateCustomerOrderForm({ customers, products, isVatPayer, onSuccess, openRef, hideTrigger }: Props) {
  const form = useCreateOrderForm(products, isVatPayer, onSuccess)
  if (openRef) openRef.current = form.handleOpen

  const isPickup      = form.shippingMethod === 'DPD_PICKUP' || form.shippingMethod === 'ZASILKOVNA_PICKUP'
  const isHomeDelivery = ['DPD_HOME', 'ZASILKOVNA_HOME', 'COURIER'].includes(form.shippingMethod)
  const shippingOption = SHIPPING_OPTIONS.find(o => o.value === form.shippingMethod)
  const shippingCost   = shippingOption?.price ?? 0

  // Sidebar customer resolution
  const selectedCustomer = customers.find(c => c.id === form.customerId)
  const sidebarName  = form.isAnonymousCustomer ? 'Anonymní zákazník'
    : form.isManualCustomer ? (form.manualCustomerData.name || '—')
    : (selectedCustomer?.name || '—')
  const sidebarEmail = form.isManualCustomer ? form.manualCustomerData.email : selectedCustomer?.email
  const sidebarPhone = form.isManualCustomer ? form.manualCustomerData.phone : selectedCustomer?.phone

  // Live sidebar total
  const sidebarTotal = (() => {
    const itemTotal = isVatPayer
      ? calculateVatSummary(form.items.map(i => calculateLineVat(i.quantity || 0, i.price || 0, i.vatRate))).totalWithVat
      : form.items.reduce((s, i) => s + (i.quantity || 0) * (i.price || 0), 0)
    const disc = form.discountType === 'percentage' && form.discountValue
      ? itemTotal * parseFloat(form.discountValue) / 100
      : form.discountType === 'fixed' && form.discountValue
        ? parseFloat(form.discountValue) : 0
    return itemTotal - disc + shippingCost
  })()

  return (
    <>
      {/* Trigger button — hidden when page manages open state via openRef */}
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

            {/* ── Header ──────────────────────────────────────────────────────── */}
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
              <button
                type="button"
                onClick={form.handleClose}
                className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* ── 2-column body ────────────────────────────────────────────────── */}
            <form
              onSubmit={form.handleSubmit}
              className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[7fr_3fr] overflow-hidden"
            >

              {/* ════ LEFT — form ════════════════════════════════════════════════ */}
              <div className="flex flex-col overflow-y-auto min-h-0 bg-white border-r border-gray-200">
                <div className="flex-1 px-6 py-6 space-y-8">

                  {/* 1. Zákazník ──────────────────────────────────────────────── */}
                  <section>
                    <SectionLabel required>Zákazník</SectionLabel>
                    <CustomerSupplierSelector
                      type="customer"
                      entities={customers}
                      selectedId={form.customerId}
                      onSelectedIdChange={form.setCustomerId}
                      manualData={form.manualCustomerData}
                      onManualDataChange={form.setManualCustomerData}
                      isManual={form.isManualCustomer}
                      onIsManualChange={form.setIsManualCustomer}
                      isAnonymous={form.isAnonymousCustomer}
                      onIsAnonymousChange={form.setIsAnonymousCustomer}
                      saveToDatabase={form.saveCustomerToDatabase}
                      onSaveToDatabaseChange={form.setSaveCustomerToDatabase}
                      required={true}
                    />
                  </section>

                  {/* 2. Datum + Platba (2-col) ────────────────────────────────── */}
                  <div className="grid grid-cols-2 gap-8">
                    <section>
                      <SectionLabel>Datum objednávky</SectionLabel>
                      <input
                        type="date"
                        value={form.orderDate}
                        onChange={e => form.setOrderDate(e.target.value)}
                        className={inp}
                      />
                    </section>
                    <section>
                      <SectionLabel required>Platební údaje</SectionLabel>
                      <PaymentDetailsSelector
                        dueDate={form.dueDate}               onDueDateChange={form.setDueDate}
                        paymentType={form.paymentType}       onPaymentTypeChange={form.setPaymentType}
                        variableSymbol={form.variableSymbol} onVariableSymbolChange={form.setVariableSymbol}
                        constantSymbol={form.constantSymbol} onConstantSymbolChange={form.setConstantSymbol}
                        specificSymbol={form.specificSymbol} onSpecificSymbolChange={form.setSpecificSymbol}
                        required={true}
                        autoGenerateNumber={form.orderNumber}
                      />
                    </section>
                  </div>

                  {/* 3. Způsob doručení ───────────────────────────────────────── */}
                  <section>
                    <SectionLabel>Způsob doručení</SectionLabel>
                    <select
                      value={form.shippingMethod}
                      onChange={e => {
                        form.setShippingMethod(e.target.value)
                        form.setPickupPointId('')
                        form.setPickupPointName('')
                        form.setPickupPointAddress('')
                      }}
                      className={inp}
                    >
                      <option value="">— Nevybráno —</option>
                      {SHIPPING_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>
                          {o.label}{o.price > 0 ? ` · ${o.price} Kč` : ' · zdarma'}
                        </option>
                      ))}
                    </select>

                    {/* Pickup point fields — cascade for DPD_PICKUP / ZASILKOVNA_PICKUP */}
                    {isPickup && (
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">ID výdejního místa</label>
                          <input value={form.pickupPointId} onChange={e => form.setPickupPointId(e.target.value)} placeholder="např. 12345" className={inp} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Název výdejního místa <span className="text-red-400">*</span></label>
                          <input value={form.pickupPointName} onChange={e => form.setPickupPointName(e.target.value)} placeholder="Název pobočky" required className={inp} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Adresa výdejního místa</label>
                          <input value={form.pickupPointAddress} onChange={e => form.setPickupPointAddress(e.target.value)} placeholder="Ulice, Město, PSČ" className={inp} />
                        </div>
                      </div>
                    )}

                    {/* Home delivery — address comes from customer card */}
                    {isHomeDelivery && (
                      <p className="mt-3 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                        Zásilka bude doručena na adresu zákazníka. Adresu zákazníka upravíte v sekci Zákazník výše.
                      </p>
                    )}
                  </section>

                  {/* 4. Fakturační adresa — conditional reveal ────────────────── */}
                  <section>
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={form.hasSeparateBilling}
                        onChange={e => form.setHasSeparateBilling(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                      />
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

                  {/* 5. Položky objednávky ────────────────────────────────────── */}
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
                              <ItemRow
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

                    <button
                      type="button"
                      onClick={form.handleAddItem}
                      className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Přidat položku
                    </button>

                    {/* Discount + totals block */}
                    <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                        <label className="text-xs font-semibold text-gray-500 shrink-0">Sleva</label>
                        <select
                          value={form.discountType}
                          onChange={e => form.setDiscountType(e.target.value as 'percentage' | 'fixed' | 'none')}
                          className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                          <option value="none">Bez slevy</option>
                          <option value="percentage">Procenta (%)</option>
                          <option value="fixed">Částka (Kč)</option>
                        </select>
                        <input
                          type="number" step="0.01" min="0"
                          max={form.discountType === 'percentage' ? '100' : undefined}
                          value={form.discountValue}
                          onChange={e => form.setDiscountValue(e.target.value)}
                          placeholder={form.discountType === 'none' ? '—' : form.discountType === 'percentage' ? 'Např. 10' : 'Např. 100'}
                          disabled={form.discountType === 'none'}
                          className="w-32 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </div>
                      <OrderTotalsPreview
                        items={form.items}
                        isVatPayer={isVatPayer}
                        discountType={form.discountType}
                        discountValue={form.discountValue}
                        shippingCost={shippingCost}
                        shippingLabel={shippingOption?.label}
                      />
                    </div>
                  </section>

                  {/* 6. Poznámka ──────────────────────────────────────────────── */}
                  <section>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                      Poznámka <span className="normal-case font-normal text-gray-300">(volitelné)</span>
                    </label>
                    <textarea
                      value={form.note}
                      onChange={e => form.setNote(e.target.value)}
                      placeholder="Interní poznámka k objednávce…"
                      rows={3}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-100 focus:outline-none bg-white resize-none transition-colors placeholder:text-gray-300"
                    />
                  </section>

                </div>

                {/* Sticky footer ──────────────────────────────────────────────── */}
                <div className="border-t border-gray-200 px-6 py-4 bg-white flex items-center justify-between gap-4 shrink-0">
                  <button
                    type="button"
                    onClick={form.handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Zrušit
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-7 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Vytvořit objednávku
                  </button>
                </div>
              </div>

              {/* ════ RIGHT — live summary sidebar ══════════════════════════════ */}
              <div className="hidden lg:flex flex-col gap-3 p-4 overflow-y-auto bg-gray-50 min-h-0">

                {/* Card: Zákazník */}
                <SideCard icon={User} title="Zákazník">
                  <p className="font-semibold text-gray-900 leading-snug">{sidebarName}</p>
                  {sidebarEmail && <p className="text-xs text-gray-500 mt-1">{sidebarEmail}</p>}
                  {sidebarPhone && <p className="text-xs text-gray-500">{sidebarPhone}</p>}
                  {sidebarName === '—' && (
                    <p className="text-xs text-gray-400 italic">Zákazník nevybrán</p>
                  )}
                </SideCard>

                {/* Card: Doručení */}
                <SideCard icon={MapPin} title="Doručení">
                  {!form.shippingMethod ? (
                    <p className="text-xs text-gray-400 italic">Způsob doručení nevybrán</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-medium text-gray-800 leading-snug">{shippingOption?.label}</p>
                      <p className="text-xs text-gray-500">
                        {shippingCost > 0 ? `${shippingCost} Kč` : 'Zdarma'}
                      </p>
                      {isPickup && form.pickupPointName && (
                        <div className="pt-1 border-t border-gray-100 space-y-0.5">
                          <p className="font-semibold text-gray-900 text-sm">{form.pickupPointName}</p>
                          {form.pickupPointAddress && (
                            <p className="text-xs text-gray-500 leading-relaxed">{form.pickupPointAddress}</p>
                          )}
                          {form.pickupPointId && (
                            <p className="text-[11px] text-gray-400 font-mono">ID: {form.pickupPointId}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </SideCard>

                {/* Card: Souhrn */}
                <SideCard icon={CreditCard} title="Souhrn objednávky">
                  <div className="space-y-2.5 text-sm">
                    <SideRow label="Číslo" value={form.orderNumber ? `#${form.orderNumber}` : '—'} mono />
                    <SideRow label="Datum" value={form.orderDate ? new Date(form.orderDate).toLocaleDateString('cs-CZ') : '—'} />
                    <SideRow label="Platba" value={form.paymentType ? (PAYMENT_LABELS[form.paymentType] || form.paymentType) : '—'} />
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
      {children}
      {required && <span className="text-red-400 ml-1 normal-case font-normal">*</span>}
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

function BillingAddressFields({
  value,
  onChange,
}: {
  value: BillingAddress
  onChange: React.Dispatch<React.SetStateAction<BillingAddress>>
}) {
  const set = (field: keyof BillingAddress) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange(prev => ({ ...prev, [field]: e.target.value }))

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-100 focus:outline-none bg-white transition-colors'
  const labelCls = 'block text-xs font-semibold text-gray-500 mb-1.5'

  return (
    <div className="grid grid-cols-4 gap-3">
      <div className="col-span-2">
        <label className={labelCls}>Jméno / Příjemce <span className="text-red-400">*</span></label>
        <input value={value.billingName} onChange={set('billingName')} placeholder="Jan Novák" required className={inputCls} />
      </div>
      <div className="col-span-2">
        <label className={labelCls}>Firma</label>
        <input value={value.billingCompany} onChange={set('billingCompany')} placeholder="Název firmy" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>IČO</label>
        <input value={value.billingIco} onChange={set('billingIco')} placeholder="12345678" maxLength={12} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>DIČ</label>
        <input value={value.billingDic} onChange={set('billingDic')} placeholder="CZ12345678" className={inputCls} />
      </div>
      <div className="col-span-2">
        <label className={labelCls}>Ulice a č.p. <span className="text-red-400">*</span></label>
        <input value={value.billingStreet} onChange={set('billingStreet')} placeholder="Ulice a číslo domu" required className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Město <span className="text-red-400">*</span></label>
        <input value={value.billingCity} onChange={set('billingCity')} placeholder="Praha" required className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>PSČ <span className="text-red-400">*</span></label>
        <input value={value.billingZip} onChange={set('billingZip')} placeholder="110 00" maxLength={10} required className={inputCls} />
      </div>
      <div className="col-span-2">
        <label className={labelCls}>Země <span className="text-red-400">*</span></label>
        <select value={value.billingCountry} onChange={set('billingCountry')} className={inputCls} required>
          {COUNTRY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
    </div>
  )
}

function ItemRow({
  item, index, products, isVatPayer, onItemChange, onRemove,
}: {
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

  const cellCls = 'px-3 py-2.5 align-middle'
  const inputCls = 'w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:border-orange-300 focus:ring-1 focus:ring-orange-100 focus:outline-none bg-white transition-colors text-center'

  return (
    <tr className="hover:bg-gray-50/60 transition-colors">
      {/* Product combobox */}
      <td className="px-4 py-2 align-middle">
        <CascadingProductDropdown
          products={products}
          value={item.productId || ''}
          onChange={productId => onItemChange(index, 'productId', productId)}
        />
      </td>

      {/* Quantity */}
      <td className={cellCls}>
        <input
          type="number" step="1" min="0"
          value={item.quantity || ''}
          onChange={e => onItemChange(index, 'quantity', e.target.value === '' ? '' : parseFloat(e.target.value))}
          placeholder="0"
          className={inputCls}
        />
      </td>

      {/* Unit */}
      <td className={cellCls}>
        <input
          value={item.unit}
          onChange={e => onItemChange(index, 'unit', e.target.value)}
          placeholder="ks"
          className={inputCls}
        />
      </td>

      {/* VAT badge — VAT payers only */}
      {isVatPayer && (
        <td className={cellCls}>
          <div className={`px-2 py-2 border rounded-lg text-xs text-center ${
            isNonVatPayer(item.vatRate)
              ? 'bg-gray-50 text-gray-400 border-gray-200'
              : 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
          }`}>
            {isNonVatPayer(item.vatRate) ? '—' : (VAT_RATE_LABELS[item.vatRate] || `${item.vatRate}%`)}
          </div>
        </td>
      )}

      {/* Price per unit — editable */}
      <td className={cellCls}>
        <input
          type="number" step="1" min="0"
          value={item.price || ''}
          onChange={e => onItemChange(index, 'price', e.target.value === '' ? '' : parseFloat(e.target.value))}
          placeholder="0"
          className={inputCls}
        />
      </td>

      {/* Row total — computed, read-only */}
      <td className={cellCls}>
        <div className="px-2.5 py-2 border border-gray-100 rounded-lg text-sm text-center font-semibold bg-gray-50 text-gray-900 whitespace-nowrap">
          {total.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč
        </div>
      </td>

      {/* Delete */}
      <td className="px-2 py-2 align-middle">
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  )
}
