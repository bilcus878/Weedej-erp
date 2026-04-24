'use client'

import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Package, Plus, Trash2, ChevronDown } from 'lucide-react'
import { isNonVatPayer, VAT_RATE_LABELS, calculateLineVat } from '@/lib/vatCalculation'
import CustomerSupplierSelector from '@/components/CustomerSupplierSelector'
import { CascadingProductDropdown } from '@/components/CascadingProductDropdown'
import { CreateOrderPopup } from '@/components/warehouse/create/CreateOrderPopup'
import { useCreatePurchaseOrderForm } from '../hooks/useCreatePurchaseOrderForm'
import { PurchaseOrderTotals } from './PurchaseOrderTotals'
import type { MutableRefObject } from 'react'
import type { Supplier, Product } from '../types'

interface Props {
  suppliers:    Supplier[]
  products:     Product[]
  isVatPayer:   boolean
  onSuccess:    () => Promise<void>
  openRef?:     MutableRefObject<() => void>
  hideTrigger?: boolean
}

export function CreatePurchaseOrderForm({ suppliers, products, isVatPayer, onSuccess, openRef, hideTrigger }: Props) {
  const form = useCreatePurchaseOrderForm(products, isVatPayer, onSuccess)
  if (openRef) openRef.current = form.handleOpen

  return (
    <CreateOrderPopup
      title="Nová objednávka dodavateli"
      orderNumber={form.open ? form.orderNumber : undefined}
      open={form.open}
      onOpen={form.handleOpen}
      onClose={form.handleClose}
      hideTrigger={hideTrigger}
    >
      <form onSubmit={form.handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3 items-stretch">
          {/* Dodavatel */}
          <div className="border border-gray-200 rounded-lg flex flex-col">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 rounded-t-lg">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dodavatel</h3>
            </div>
            <div className="flex-1 flex items-center p-3">
              <div className="w-full">
                <CustomerSupplierSelector
                  compact type="supplier" entities={suppliers} selectedId={form.supplierId}
                  onSelectedIdChange={form.setSupplierId} manualData={form.manualSupplierData}
                  onManualDataChange={form.setManualSupplierData} isManual={form.isManualSupplier}
                  onIsManualChange={form.setIsManualSupplier} isAnonymous={form.isAnonymousSupplier}
                  onIsAnonymousChange={form.setIsAnonymousSupplier} saveToDatabase={form.saveSupplierToDatabase}
                  onSaveToDatabaseChange={form.setSaveSupplierToDatabase} required={false}
                />
              </div>
            </div>
          </div>

          {/* Termíny */}
          <div className="border border-gray-200 rounded-lg flex flex-col">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 rounded-t-lg">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Termíny</h3>
            </div>
            <div className="flex-1 flex items-center p-3">
              <div className="grid grid-cols-2 gap-3 w-full">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Datum objednávky</label>
                  <Input type="date" value={form.orderDate} onChange={e => form.handleOrderDateChange(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Očekávané dodání</label>
                  <Input type="date" value={form.expectedDate} onChange={e => form.setExpectedDate(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Platební údaje */}
          <div className="border border-gray-200 rounded-lg flex flex-col">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 rounded-t-lg">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Platební údaje</h3>
            </div>
            <div className="flex-1 flex items-center p-3">
              <div className="w-full space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Datum splatnosti</label>
                    <Input type="date" value={form.dueDate} onChange={e => form.setDueDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Forma úhrady</label>
                    <div className="relative">
                      <select value={form.paymentType} onChange={e => form.setPaymentType(e.target.value)}
                        className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 pr-9 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">Vyberte...</option>
                        <option value="cash">Hotově</option>
                        <option value="card">Kartou</option>
                        <option value="transfer">Převodem</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
                {form.paymentType === 'transfer' && (
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                    <div><label className="text-xs text-gray-500 mb-1 block">Variabilní symbol</label><Input value={form.variableSymbol} onChange={e => form.setVariableSymbol(e.target.value)} placeholder="VS" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Konstantní symbol</label><Input value={form.constantSymbol} onChange={e => form.setConstantSymbol(e.target.value)} placeholder="KS" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Specifický symbol</label><Input value={form.specificSymbol} onChange={e => form.setSpecificSymbol(e.target.value)} placeholder="SS" /></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Poznámka */}
          <div className="border border-gray-200 rounded-lg flex flex-col">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 rounded-t-lg">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Poznámka</h3>
            </div>
            <div className="flex-1 p-3">
              <textarea value={form.note} onChange={e => form.setNote(e.target.value)}
                placeholder="Volitelná poznámka..."
                className="w-full h-full min-h-[80px] text-sm rounded-md border border-gray-300 bg-white px-3 py-2 resize-none placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Manual supplier */}
        {form.isManualSupplier && !form.isAnonymousSupplier && (
          <div className="border border-blue-200 rounded-lg bg-blue-50/30">
            <div className="bg-blue-50 px-3 py-2 border-b border-blue-200 rounded-t-lg flex items-center justify-between">
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Údaje o dodavateli — ruční zadání</h3>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={form.saveSupplierToDatabase} onChange={e => form.setSaveSupplierToDatabase(e.target.checked)} className="w-3.5 h-3.5" />
                <span className="text-xs text-blue-700">Uložit do databáze</span>
              </label>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-4 flex items-center gap-4 mb-1">
                  <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input type="radio" name="supplierEntityType" value="company" checked={form.manualSupplierData.entityType === 'company'} onChange={() => form.setManualSupplierData({ ...form.manualSupplierData, entityType: 'company' })} className="w-3.5 h-3.5" />
                    🏢 Firma
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input type="radio" name="supplierEntityType" value="individual" checked={form.manualSupplierData.entityType === 'individual'} onChange={() => form.setManualSupplierData({ ...form.manualSupplierData, entityType: 'individual' })} className="w-3.5 h-3.5" />
                    👤 Fyzická osoba
                  </label>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{form.manualSupplierData.entityType === 'individual' ? 'Jméno a příjmení' : 'Název'} *</label>
                  <Input value={form.manualSupplierData.name} onChange={e => form.setManualSupplierData({ ...form.manualSupplierData, name: e.target.value })} placeholder={form.manualSupplierData.entityType === 'individual' ? 'Jan Novák' : 'Název firmy'} required />
                </div>
                {form.manualSupplierData.entityType === 'company' && (
                  <div><label className="text-xs text-gray-500 mb-1 block">Kontaktní osoba</label><Input value={form.manualSupplierData.contactPerson} onChange={e => form.setManualSupplierData({ ...form.manualSupplierData, contactPerson: e.target.value })} /></div>
                )}
                <div><label className="text-xs text-gray-500 mb-1 block">Email</label><Input type="email" value={form.manualSupplierData.email} onChange={e => form.setManualSupplierData({ ...form.manualSupplierData, email: e.target.value })} /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">Telefon</label><Input value={form.manualSupplierData.phone} onChange={e => form.setManualSupplierData({ ...form.manualSupplierData, phone: e.target.value })} /></div>
                {form.manualSupplierData.entityType === 'company' && (<>
                  <div><label className="text-xs text-gray-500 mb-1 block">IČO</label><Input value={form.manualSupplierData.ico} onChange={e => form.setManualSupplierData({ ...form.manualSupplierData, ico: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500 mb-1 block">DIČ</label><Input value={form.manualSupplierData.dic} onChange={e => form.setManualSupplierData({ ...form.manualSupplierData, dic: e.target.value })} /></div>
                </>)}
                <div><label className="text-xs text-gray-500 mb-1 block">Číslo účtu</label><Input value={form.manualSupplierData.bankAccount} onChange={e => form.setManualSupplierData({ ...form.manualSupplierData, bankAccount: e.target.value })} /></div>
                {form.manualSupplierData.entityType === 'company' && (
                  <div><label className="text-xs text-gray-500 mb-1 block">Web</label><Input value={form.manualSupplierData.website} onChange={e => form.setManualSupplierData({ ...form.manualSupplierData, website: e.target.value })} /></div>
                )}
                <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Adresa *</label><Input value={form.manualSupplierData.address} onChange={e => form.setManualSupplierData({ ...form.manualSupplierData, address: e.target.value })} required /></div>
                <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Poznámka</label><Input value={form.manualSupplierData.note} onChange={e => form.setManualSupplierData({ ...form.manualSupplierData, note: e.target.value })} /></div>
              </div>
            </div>
          </div>
        )}

        {form.isAnonymousSupplier && (
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
            Dodavatel bude uložen jako „Anonymní dodavatel" bez dalších údajů.
          </div>
        )}

        {/* Items */}
        <div className="border border-gray-200 rounded-lg">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 rounded-t-lg flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
              Položky objednávky <span className="text-red-400">*</span>
            </h3>
            <Button type="button" onClick={form.handleAddItem} size="sm" className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-3 h-3 mr-1" />Přidat
            </Button>
          </div>
          <div className="p-3">
            {form.items.map((item, index) => (
              <div key={index} className={`grid ${isVatPayer ? 'grid-cols-[4fr_2fr_1fr_1fr_2fr_2fr_auto]' : 'grid-cols-12'} gap-2 mb-1.5 items-end bg-white rounded border border-gray-200 hover:border-blue-300 transition-colors px-2 py-1.5`}>
                <div className={isVatPayer ? '' : 'col-span-4'}>
                  <CascadingProductDropdown
                    products={products}
                    value={item.productId || ''}
                    onChange={productId => form.handleItemChange(index, 'productId', productId)}
                  />
                </div>
                <div className={isVatPayer ? '' : 'col-span-2'}>
                  <label className="text-xs text-gray-600 mb-1 block">Množství</label>
                  <Input type="number" step="1" value={item.quantity || ''} onChange={e => form.handleItemChange(index, 'quantity', e.target.value === '' ? '' : parseFloat(e.target.value))} className="bg-white" />
                </div>
                <div className={isVatPayer ? '' : 'col-span-2'}>
                  <label className="text-xs text-gray-600 mb-1 block">Jedn.</label>
                  <Input value={item.unit} onChange={e => form.handleItemChange(index, 'unit', e.target.value)} placeholder="ks" className="bg-white" />
                </div>
                {isVatPayer && (
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">DPH</label>
                    <div className={`px-2 py-2 border rounded text-sm text-center ${isNonVatPayer(item.vatRate) ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                      {isNonVatPayer(item.vatRate) ? '-' : (VAT_RATE_LABELS[item.vatRate] || `${item.vatRate}%`)}
                    </div>
                  </div>
                )}
                <div className={isVatPayer ? '' : 'col-span-3'}>
                  <label className="text-xs text-gray-600 mb-1 block">Cena/ks</label>
                  <Input type="number" step="1" value={item.expectedPrice || ''} onChange={e => form.handleItemChange(index, 'expectedPrice', e.target.value === '' ? '' : parseFloat(e.target.value))} className="bg-white" />
                </div>
                {isVatPayer && (
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Celkem</label>
                    {(() => {
                      const total = !isNonVatPayer(item.vatRate)
                        ? calculateLineVat(item.quantity || 0, item.expectedPrice || 0, item.vatRate).totalWithVat
                        : (item.quantity || 0) * (item.expectedPrice || 0)
                      return <div className="px-2 py-2 border rounded text-sm text-right font-medium bg-gray-50 text-gray-800 border-gray-200">{total.toLocaleString('cs-CZ')} Kč</div>
                    })()}
                  </div>
                )}
                <div className={isVatPayer ? '' : 'col-span-1'}>
                  <Button type="button" variant="ghost" size="sm" onClick={() => form.handleRemoveItem(index)} className="hover:bg-red-100 hover:text-red-700 w-full">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {isVatPayer && <PurchaseOrderTotals items={form.items} />}
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={form.handleClose} className="px-5 hover:bg-gray-100">Zrušit</Button>
          <Button type="submit" className="px-6 bg-blue-600 hover:bg-blue-700 text-white">
            <Package className="w-4 h-4 mr-2" />Vytvořit objednávku
          </Button>
        </div>
      </form>
    </CreateOrderPopup>
  )
}
