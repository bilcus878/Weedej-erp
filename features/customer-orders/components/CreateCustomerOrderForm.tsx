'use client'

import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ShoppingCart, Plus, Trash2 } from 'lucide-react'
import { VAT_RATE_LABELS, isNonVatPayer, calculateLineVat } from '@/lib/vatCalculation'
import CustomerSupplierSelector from '@/components/CustomerSupplierSelector'
import PaymentDetailsSelector from '@/components/PaymentDetailsSelector'
import { CreateOrderPopup } from '@/components/warehouse/create/CreateOrderPopup'
import { useCreateOrderForm } from '../hooks/useCreateOrderForm'
import { CascadingProductDropdown } from '@/components/CascadingProductDropdown'
import { OrderTotalsPreview } from './OrderTotalsPreview'
import type { MutableRefObject } from 'react'
import type { BillingAddress, Customer, CustomerOrderItem, Product } from '../types'

interface Props {
  customers:    Customer[]
  products:     Product[]
  isVatPayer:   boolean
  onSuccess:    () => Promise<void>
  openRef?:     MutableRefObject<() => void>
  hideTrigger?: boolean
}

const SHIPPING_OPTIONS = [
  { value: 'DPD_HOME',          label: 'DPD — Doručení na adresu' },
  { value: 'DPD_PICKUP',        label: 'DPD — Výdejní místo' },
  { value: 'ZASILKOVNA_HOME',   label: 'Zásilkovna — Doručení na adresu' },
  { value: 'ZASILKOVNA_PICKUP', label: 'Zásilkovna — Výdejní místo / Z-BOX' },
  { value: 'COURIER',           label: 'Kurýr' },
  { value: 'PICKUP_IN_STORE',   label: 'Osobní odběr' },
]

const COUNTRY_OPTIONS = [
  { value: 'CZ', label: 'Česká republika' },
  { value: 'SK', label: 'Slovensko' },
  { value: 'DE', label: 'Německo' },
  { value: 'AT', label: 'Rakousko' },
  { value: 'PL', label: 'Polsko' },
]

const selectClass = 'w-full h-9 rounded border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export function CreateCustomerOrderForm({ customers, products, isVatPayer, onSuccess, openRef, hideTrigger }: Props) {
  const form = useCreateOrderForm(products, isVatPayer, onSuccess)
  if (openRef) openRef.current = form.handleOpen
  const isPickup = form.shippingMethod === 'DPD_PICKUP' || form.shippingMethod === 'ZASILKOVNA_PICKUP'

  return (
    <CreateOrderPopup
      title="Nová zákaznická objednávka"
      orderNumber={form.open ? form.orderNumber : undefined}
      open={form.open}
      onOpen={form.handleOpen}
      onClose={form.handleClose}
      hideTrigger={hideTrigger}
    >
      <form onSubmit={form.handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3 items-stretch">

          {/* ── Zákazník ──────────────────────────────────────────────── */}
          <Section title={<>Zákazník <span className="text-red-400">*</span></>}>
            <CustomerSupplierSelector
              type="customer" entities={customers}
              selectedId={form.customerId} onSelectedIdChange={form.setCustomerId}
              manualData={form.manualCustomerData} onManualDataChange={form.setManualCustomerData}
              isManual={form.isManualCustomer} onIsManualChange={form.setIsManualCustomer}
              isAnonymous={form.isAnonymousCustomer} onIsAnonymousChange={form.setIsAnonymousCustomer}
              saveToDatabase={form.saveCustomerToDatabase} onSaveToDatabaseChange={form.setSaveCustomerToDatabase}
              required={true}
            />
          </Section>

          {/* ── Termíny ───────────────────────────────────────────────── */}
          <Section title="Termíny">
            <label className="text-xs text-gray-500 mb-1 block">Datum objednávky</label>
            <Input type="date" value={form.orderDate} onChange={e => form.setOrderDate(e.target.value)} />
          </Section>

          {/* ── Způsob doručení ───────────────────────────────────────── */}
          <div className="col-span-2">
            <Section title="Způsob doručení" grow>
              <div className="space-y-3">
                <select
                  value={form.shippingMethod}
                  onChange={e => { form.setShippingMethod(e.target.value); form.setPickupPointId(''); form.setPickupPointName(''); form.setPickupPointAddress('') }}
                  className={selectClass}
                >
                  <option value="">— Nevybráno —</option>
                  {SHIPPING_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                {/* Pickup point details — shown for pickup delivery types */}
                {isPickup && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">ID výdejního místa</label>
                      <Input
                        value={form.pickupPointId}
                        onChange={e => form.setPickupPointId(e.target.value)}
                        placeholder="např. 12345"
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Název výdejního místa <span className="text-red-400">*</span></label>
                      <Input
                        value={form.pickupPointName}
                        onChange={e => form.setPickupPointName(e.target.value)}
                        placeholder="Název pobočky"
                        className="bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Adresa výdejního místa</label>
                      <Input
                        value={form.pickupPointAddress}
                        onChange={e => form.setPickupPointAddress(e.target.value)}
                        placeholder="Ulice, Město, PSČ"
                        className="bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </Section>
          </div>

          {/* ── Fakturační adresa ─────────────────────────────────────── */}
          <div className="col-span-2">
            <Section title="Fakturační adresa" grow>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.hasSeparateBilling}
                    onChange={e => form.setHasSeparateBilling(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Fakturační adresa se liší od doručovací adresy</span>
                </label>

                {form.hasSeparateBilling && (
                  <BillingAddressFields value={form.billingAddress} onChange={form.setBillingAddress} />
                )}
              </div>
            </Section>
          </div>

          {/* ── Platební údaje ────────────────────────────────────────── */}
          <Section title="Platební údaje">
            <PaymentDetailsSelector
              dueDate={form.dueDate} onDueDateChange={form.setDueDate}
              paymentType={form.paymentType} onPaymentTypeChange={form.setPaymentType}
              variableSymbol={form.variableSymbol} onVariableSymbolChange={form.setVariableSymbol}
              constantSymbol={form.constantSymbol} onConstantSymbolChange={form.setConstantSymbol}
              specificSymbol={form.specificSymbol} onSpecificSymbolChange={form.setSpecificSymbol}
              required={true} autoGenerateNumber={form.orderNumber}
            />
          </Section>

          {/* ── Poznámka ──────────────────────────────────────────────── */}
          <Section title="Poznámka" grow>
            <textarea
              value={form.note} onChange={e => form.setNote(e.target.value)}
              placeholder="Volitelná poznámka..."
              className="w-full h-full min-h-[80px] text-sm rounded-md border border-gray-300 bg-white px-3 py-2 resize-none placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </Section>
        </div>

        {/* ── Položky objednávky ──────────────────────────────────────── */}
        <div className="border border-gray-200 rounded-lg">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 rounded-t-lg flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
              Položky objednávky <span className="text-red-400 ml-0.5">*</span>
            </h3>
            <Button type="button" onClick={form.handleAddItem} size="sm" className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-3 h-3 mr-1" />Přidat
            </Button>
          </div>
          <div className="p-3">
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

            <div className="mt-2 bg-gray-50 rounded border border-gray-200 overflow-hidden">
              <div className="p-3 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-[auto_1fr_1fr] gap-3 items-center">
                  <label className="text-sm font-medium text-gray-700">Sleva:</label>
                  <select
                    value={form.discountType}
                    onChange={e => form.setDiscountType(e.target.value as 'percentage' | 'fixed' | 'none')}
                    className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="none">Bez slevy</option>
                    <option value="percentage">Procenta (%)</option>
                    <option value="fixed">Částka (Kč)</option>
                  </select>
                  <Input
                    type="number" step="0.01" min="0"
                    max={form.discountType === 'percentage' ? '100' : undefined}
                    value={form.discountValue}
                    onChange={e => form.setDiscountValue(e.target.value)}
                    placeholder={form.discountType === 'none' ? 'Nejprve zvolte typ' : form.discountType === 'percentage' ? 'Např. 10' : 'Např. 100'}
                    disabled={form.discountType === 'none'}
                    className="bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
              <OrderTotalsPreview
                items={form.items}
                isVatPayer={isVatPayer}
                discountType={form.discountType}
                discountValue={form.discountValue}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={form.handleClose} className="px-5 hover:bg-gray-100">Zrušit</Button>
          <Button type="submit" className="px-6 bg-blue-600 hover:bg-blue-700 text-white">
            <ShoppingCart className="w-4 h-4 mr-2" />Vytvořit objednávku
          </Button>
        </div>
      </form>
    </CreateOrderPopup>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children, grow }: { title: React.ReactNode; children: React.ReactNode; grow?: boolean }) {
  return (
    <div className="border border-gray-200 rounded-lg flex flex-col">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 rounded-t-lg">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
      </div>
      <div className={`flex-1 ${grow ? 'p-3' : 'flex items-center p-3'}`}>
        {grow ? children : <div className="w-full">{children}</div>}
      </div>
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

  return (
    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-100">
      <div className="col-span-2">
        <label className="text-xs text-gray-600 mb-1 block">Jméno / Příjemce *</label>
        <Input value={value.billingName} onChange={set('billingName')} placeholder="Jan Novák" required className="bg-white" />
      </div>
      <div className="col-span-2">
        <label className="text-xs text-gray-600 mb-1 block">Firma</label>
        <Input value={value.billingCompany} onChange={set('billingCompany')} placeholder="Název firmy" className="bg-white" />
      </div>
      <div>
        <label className="text-xs text-gray-600 mb-1 block">IČO</label>
        <Input value={value.billingIco} onChange={set('billingIco')} placeholder="12345678" maxLength={12} className="bg-white" />
      </div>
      <div>
        <label className="text-xs text-gray-600 mb-1 block">DIČ</label>
        <Input value={value.billingDic} onChange={set('billingDic')} placeholder="CZ12345678" className="bg-white" />
      </div>
      <div className="col-span-2">
        <label className="text-xs text-gray-600 mb-1 block">Ulice a č.p. *</label>
        <Input value={value.billingStreet} onChange={set('billingStreet')} placeholder="Ulice a číslo domu" required className="bg-white" />
      </div>
      <div>
        <label className="text-xs text-gray-600 mb-1 block">Město *</label>
        <Input value={value.billingCity} onChange={set('billingCity')} placeholder="Praha" required className="bg-white" />
      </div>
      <div>
        <label className="text-xs text-gray-600 mb-1 block">PSČ *</label>
        <Input value={value.billingZip} onChange={set('billingZip')} placeholder="110 00" maxLength={10} required className="bg-white" />
      </div>
      <div className="col-span-2">
        <label className="text-xs text-gray-600 mb-1 block">Země *</label>
        <select value={value.billingCountry} onChange={set('billingCountry')} className={selectClass} required>
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

  return (
    <div
      className={`grid ${isVatPayer ? 'grid-cols-[4fr_2fr_1fr_1fr_2fr_2fr_auto]' : 'grid-cols-[3fr_1fr_0.8fr_1.2fr_1.2fr_auto]'} gap-2 mb-1.5 items-end bg-white rounded border border-gray-200 hover:border-blue-300 transition-colors px-2 py-1.5`}
    >
      <CascadingProductDropdown
        products={products}
        value={item.productId || ''}
        onChange={productId => onItemChange(index, 'productId', productId)}
      />
      <div>
        <label className="text-xs text-gray-600 mb-1 block">Množství</label>
        <Input type="number" step="1" value={item.quantity || ''} onChange={e => onItemChange(index, 'quantity', e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="0" className="bg-white" />
      </div>
      <div>
        <label className="text-xs text-gray-600 mb-1 block">Jedn.</label>
        <Input value={item.unit} onChange={e => onItemChange(index, 'unit', e.target.value)} placeholder="ks" className="bg-white" />
      </div>
      {isVatPayer && (
        <div>
          <label className="text-xs text-gray-600 mb-1 block">DPH</label>
          <div className={`px-2 py-2 border rounded text-sm text-center ${isNonVatPayer(item.vatRate) ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
            {isNonVatPayer(item.vatRate) ? '-' : (VAT_RATE_LABELS[item.vatRate] || `${item.vatRate}%`)}
          </div>
        </div>
      )}
      <div>
        <label className="text-xs text-gray-600 mb-1 block">Cena/ks</label>
        <Input type="number" step="1" value={item.price || ''} onChange={e => onItemChange(index, 'price', e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="0" className="bg-white" />
      </div>
      <div>
        <label className="text-xs text-gray-600 mb-1 block">Celkem</label>
        <div className="px-2 py-2 border rounded text-sm text-right font-medium bg-gray-50 text-gray-800 border-gray-200">
          {total.toLocaleString('cs-CZ')} Kč
        </div>
      </div>
      <div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)} className="hover:bg-red-100 hover:text-red-700 transition-colors w-full">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
