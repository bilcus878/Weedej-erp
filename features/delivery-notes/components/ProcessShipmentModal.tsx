'use client'

import { AlertTriangle, Package } from 'lucide-react'
import Button from '@/components/ui/Button'
import { CustomerOrderDetail } from '@/components/erp'
import type { OrderDetailData } from '@/components/erp'
import { formatPrice } from '@/lib/utils'
import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import type { DeliveryNoteItem, CustomerOrder } from '../types'

// Map a pending CustomerOrder to the shape CustomerOrderDetail expects
function mapToOrderDetail(order: CustomerOrder): OrderDetailData {
  return {
    id:          order.id,
    orderNumber: order.orderNumber,
    orderDate:   order.orderDate,
    status:      order.status,
    totalAmount: Number(order.totalAmount),

    customerName:    order.customer?.name || order.customerName || null,
    customerEmail:   (order as any).customerEmail   || null,
    customerPhone:   (order as any).customerPhone   || null,
    customerAddress: (order as any).customerAddress || null,

    billingName:    (order as any).billingName    || null,
    billingCompany: (order as any).billingCompany || null,
    billingIco:     (order as any).billingIco     || null,
    billingStreet:  (order as any).billingStreet  || null,
    billingCity:    (order as any).billingCity    || null,
    billingZip:     (order as any).billingZip     || null,
    billingCountry: (order as any).billingCountry || null,

    shippingMethod:     order.shippingMethod     || null,
    pickupPointId:      order.pickupPointId      || null,
    pickupPointName:    order.pickupPointName    || null,
    pickupPointAddress: order.pickupPointAddress || null,
    pickupPointCarrier: order.pickupPointCarrier || null,
    trackingNumber:     (order as any).trackingNumber || null,
    carrier:            (order as any).carrier        || null,

    paidAt:           (order as any).paidAt    ? new Date((order as any).paidAt).toISOString()    : null,
    shippedAt:        (order as any).shippedAt ? new Date((order as any).shippedAt).toISOString() : null,
    paymentReference: (order as any).paymentReference || null,
    note:             (order as any).note || null,
    discountAmount:   null,
    stornoAt:         null,
    stornoBy:         null,
    stornoReason:     null,

    issuedInvoice: (order as any).issuedInvoice ? {
      id:             (order as any).issuedInvoice.id,
      invoiceNumber:  (order as any).issuedInvoice.invoiceNumber,
      paymentStatus:  (order as any).issuedInvoice.paymentStatus  || 'unknown',
      paymentType:    (order as any).issuedInvoice.paymentType    || null,
      status:         (order as any).issuedInvoice.status         || 'active',
      invoiceDate:    (order as any).issuedInvoice.invoiceDate    || order.orderDate,
      dueDate:        (order as any).issuedInvoice.dueDate        || null,
      variableSymbol: (order as any).issuedInvoice.variableSymbol || null,
      constantSymbol: (order as any).issuedInvoice.constantSymbol || null,
      specificSymbol: (order as any).issuedInvoice.specificSymbol || null,
    } : null,

    items: order.items
      .filter(i => i.productId != null)
      .map(item => ({
        id:          item.id,
        productId:   item.productId,
        productName: item.productName,
        quantity:    Number(item.quantity),
        unit:        item.unit,
        price:       Number(item.price),
        vatRate:     Number(item.vatRate ?? 21),
        vatAmount:   Number(item.vatAmount ?? 0),
        priceWithVat: Number(item.priceWithVat ?? item.price),
        product:     item.product
          ? { id: item.product.id, name: item.product.name, price: Number(item.price), unit: item.unit }
          : null,
      })),

    deliveryNotes: [],
  }
}

interface Props {
  isVatPayer:           boolean
  isCustomerOrder:      boolean
  processingOrder?:     CustomerOrder | null
  processingNoteItems:  DeliveryNoteItem[]
  shippedQuantities:    Record<string, number>
  setShippedQuantities: (q: Record<string, number>) => void
  processNote:          string
  setProcessNote:       (n: string) => void
  isProcessing:         boolean
  onConfirm:            () => Promise<void>
  onClose:              () => void
}

export function ProcessShipmentModal({
  isVatPayer, isCustomerOrder, processingOrder,
  processingNoteItems, shippedQuantities, setShippedQuantities,
  processNote, setProcessNote,
  isProcessing, onConfirm, onClose,
}: Props) {
  const orderDetail = processingOrder ? mapToOrderDetail(processingOrder) : null
  const orderHref   = processingOrder
    ? `/${processingOrder.orderNumber?.startsWith('ESH') ? 'eshop-orders' : 'customer-orders'}?highlight=${processingOrder.id}`
    : undefined

  const total = processingNoteItems.reduce((sum, item) => {
    const s     = shippedQuantities[item.id!] || 0
    const saved = item.price != null && item.priceWithVat != null
    const up    = saved ? Number(item.price)    : Number(item.product?.price || 0)
    const vr    = saved ? Number(item.vatRate ?? DEFAULT_VAT_RATE) : Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
    const nv    = isNonVatPayer(vr)
    const vpu   = saved ? Number(item.vatAmount ?? 0) : (nv ? 0 : up * vr / 100)
    const pwv   = saved ? Number(item.priceWithVat)   : (up + vpu)
    const isV   = item.isVariant ?? false
    const equiv = isV && item.variantValue ? s / item.variantValue : s
    return sum + equiv * (isVatPayer ? pwv : up)
  }, 0)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-stretch justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full max-w-[1440px] sm:my-4 flex flex-col sm:max-h-[calc(100vh-2rem)] overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white shrink-0">
          <Package className="w-6 h-6 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xl font-bold">{isCustomerOrder ? 'Vyskladnit objednávku' : 'Vyskladnit výdejku'}</h2>
            <p className="text-orange-100 text-sm mt-0.5">Zkontroluj adresu doručení · nastav množství · odešli zásilku</p>
          </div>
          <button onClick={onClose} className="ml-auto text-white/70 hover:text-white text-2xl leading-none transition-colors shrink-0">×</button>
        </div>

        {/* ── 2-column body ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[3fr_2fr] lg:divide-x divide-gray-200 overflow-hidden">

          {/* LEFT — fulfillment workspace */}
          <div className="flex flex-col overflow-y-auto min-h-0">
            <div className="flex-1 p-5 space-y-5">

              {/* Items table */}
              <section>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Položky k vyskladnění</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm table-fixed min-w-[560px]">
                      <thead className="bg-gray-50 border-b border-gray-200 text-xs">
                        {isVatPayer ? (
                          <tr>
                            <th className="text-left px-3 py-2.5 font-semibold text-gray-600 w-[26%]">Produkt</th>
                            <th className="text-center px-3 py-2.5 font-semibold text-gray-600 w-[10%]">Obj.</th>
                            <th className="text-center px-3 py-2.5 font-semibold text-orange-700 bg-orange-50/80 w-[13%]">Vyskladnit</th>
                            <th className="text-center px-3 py-2.5 font-semibold text-gray-500 w-[7%]">DPH</th>
                            <th className="text-center px-3 py-2.5 font-semibold text-gray-600 w-[11%]">Cena/ks</th>
                            <th className="text-center px-3 py-2.5 font-semibold text-gray-500 w-[11%]">DPH/ks</th>
                            <th className="text-center px-3 py-2.5 font-semibold text-gray-600 w-[11%]">S DPH/ks</th>
                            <th className="text-center px-3 py-2.5 font-semibold text-gray-700 w-[11%]">Celkem</th>
                          </tr>
                        ) : (
                          <tr>
                            <th className="text-left px-3 py-2.5 font-semibold text-gray-600 w-[38%]">Produkt</th>
                            <th className="text-center px-3 py-2.5 font-semibold text-gray-600 w-[15%]">Objednáno</th>
                            <th className="text-center px-3 py-2.5 font-semibold text-orange-700 bg-orange-50/80 w-[17%]">Vyskladnit</th>
                            <th className="text-right px-3 py-2.5 font-semibold text-gray-600 w-[15%]">Cena/ks</th>
                            <th className="text-right px-3 py-2.5 font-semibold text-gray-700 w-[15%]">Celkem</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {processingNoteItems.map((item, idx) => {
                          const shipped      = shippedQuantities[item.id!] || 0
                          const maxAllowed   = item.quantity
                          const isVariant    = item.isVariant ?? false
                          const isOverLimit  = shipped > maxAllowed + 0.001
                          const hasSaved     = item.price != null && item.priceWithVat != null
                          const unitPrice    = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
                          const itemVatRate  = hasSaved ? Number(item.vatRate ?? DEFAULT_VAT_RATE) : Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
                          const isItemNonVat = isNonVatPayer(itemVatRate)
                          const vatPerUnit   = hasSaved ? Number(item.vatAmount ?? 0) : (isItemNonVat ? 0 : unitPrice * itemVatRate / 100)
                          const priceWithVat = hasSaved ? Number(item.priceWithVat) : (unitPrice + vatPerUnit)
                          const packEquiv    = isVariant && item.variantValue ? shipped / item.variantValue : shipped
                          const rowTotal     = packEquiv * (isVatPayer ? priceWithVat : unitPrice)
                          const orderedDisplay = isVariant && item.orderedBaseQty != null
                            ? `${item.orderedBaseQty} ${item.unit}${item.shippedBaseQty ? ` (zbývá ${item.quantity})` : ''}`
                            : `${item.quantity} ${item.unit}`

                          function handleQtyChange(raw: string) {
                            if (raw === '') { setShippedQuantities({ ...shippedQuantities, [item.id!]: 0 }); return }
                            const v = Math.round(Number(raw) * 1000) / 1000
                            setShippedQuantities({ ...shippedQuantities, [item.id!]: v < 0 ? 0 : v })
                          }

                          const inputEl = (
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="number" value={shipped || ''} onChange={e => handleQtyChange(e.target.value)}
                                min="0" max={maxAllowed} step={isVariant ? '0.001' : '1'}
                                className={`${isVariant ? 'w-20' : 'w-14'} px-2 py-1.5 border-2 rounded-md text-center font-medium text-sm focus:ring-1 transition-all ${
                                  isOverLimit ? 'border-red-400 bg-red-50 focus:ring-red-200' : 'border-orange-300 focus:border-orange-500 focus:ring-orange-200'
                                }`}
                              />
                              <span className="text-gray-400 text-xs">{item.unit}</span>
                              {isVariant && (
                                <button type="button" onClick={() => setShippedQuantities({ ...shippedQuantities, [item.id!]: maxAllowed })}
                                  className="text-[10px] text-orange-500 hover:text-orange-700 underline leading-none">vše</button>
                              )}
                            </div>
                          )

                          const rowCls = `${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-orange-50/30 transition-colors`
                          return isVatPayer ? (
                            <tr key={item.id} className={rowCls}>
                              <td className="px-3 py-2.5 font-medium text-gray-800 text-sm">
                                {item.productName || item.product?.name || 'Neznámý produkt'}
                                {isVariant && <div className="text-[11px] text-orange-500 font-normal mt-0.5">objednáno {item.orderedBaseQty} {item.unit} · zbývá {item.remainingBaseQty} {item.unit}</div>}
                              </td>
                              <td className="text-center px-3 py-2.5 text-gray-500 text-sm whitespace-nowrap">{orderedDisplay}</td>
                              <td className="text-center px-3 py-2.5 bg-orange-50/50">
                                {inputEl}
                                {isOverLimit && <div className="text-[10px] text-red-500 mt-0.5 text-center">max {maxAllowed}</div>}
                              </td>
                              <td className="text-center px-3 py-2.5 text-gray-400 text-xs whitespace-nowrap">{isItemNonVat ? '—' : `${itemVatRate}%`}</td>
                              <td className="text-center px-3 py-2.5 text-gray-600 text-sm whitespace-nowrap">{formatPrice(unitPrice)}</td>
                              <td className="text-center px-3 py-2.5 text-gray-400 text-xs whitespace-nowrap">{isItemNonVat ? '—' : formatPrice(vatPerUnit)}</td>
                              <td className="text-center px-3 py-2.5 text-gray-700 text-sm whitespace-nowrap">{formatPrice(priceWithVat)}</td>
                              <td className="text-center px-3 py-2.5 font-semibold text-gray-900 text-sm whitespace-nowrap">{formatPrice(rowTotal)}</td>
                            </tr>
                          ) : (
                            <tr key={item.id} className={rowCls}>
                              <td className="px-3 py-2.5 font-medium text-gray-800 text-sm">
                                {item.productName || item.product?.name || 'Neznámý produkt'}
                                {isVariant && <div className="text-[11px] text-orange-500 font-normal mt-0.5">objednáno {item.orderedBaseQty} {item.unit} · zbývá {item.remainingBaseQty} {item.unit}</div>}
                              </td>
                              <td className="text-center px-3 py-2.5 text-gray-500 text-sm whitespace-nowrap">{orderedDisplay}</td>
                              <td className="text-center px-3 py-2.5 bg-orange-50/50">
                                {inputEl}
                                {isOverLimit && <div className="text-[10px] text-red-500 mt-0.5 text-center">max {maxAllowed}</div>}
                              </td>
                              <td className="text-right px-3 py-2.5 text-gray-600 text-sm whitespace-nowrap">{formatPrice(unitPrice)}</td>
                              <td className="text-right px-3 py-2.5 font-semibold text-gray-900 text-sm whitespace-nowrap">{formatPrice(rowTotal)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="border-t-2 border-gray-200 bg-gray-100 text-sm font-bold">
                        <tr>
                          <td colSpan={isVatPayer ? 7 : 4} className="px-3 py-2.5 text-gray-700">{isVatPayer ? 'CELKEM S DPH' : 'CELKEM'}</td>
                          <td className={`${isVatPayer ? 'text-center' : 'text-right'} px-3 py-2.5 text-gray-900 whitespace-nowrap`}>{formatPrice(total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </section>

              {/* Note */}
              <section>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Poznámka k vyskladnění <span className="font-normal text-gray-400 text-xs">(volitelné)</span>
                </label>
                <textarea
                  value={processNote} onChange={e => setProcessNote(e.target.value)}
                  placeholder="Volitelná poznámka k zásilce…" rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 bg-white resize-none transition-all"
                />
              </section>

              {/* Warning */}
              <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Po vyskladnění se zboží odečte ze skladu a uvolní se rezervace.&nbsp;
                  <strong className="font-semibold">Tato akce je nevratná.</strong>
                </p>
              </div>

            </div>

            {/* Sticky footer */}
            <div className="border-t border-gray-200 px-5 py-4 bg-white flex items-center justify-between gap-3 shrink-0">
              <Button variant="ghost" onClick={onClose} className="text-gray-600">Zrušit</Button>
              <Button
                onClick={onConfirm} disabled={isProcessing}
                className="px-7 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isProcessing ? '⏳ Zpracovávám…' : '📦 Vyskladnit zásilku'}
              </Button>
            </div>
          </div>

          {/* RIGHT — shipment summary panel */}
          <div className="hidden lg:flex flex-col overflow-y-auto bg-gray-50/60 min-h-0">
            <div className="px-5 py-3 border-b border-gray-200 bg-white shrink-0">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Shrnutí zásilky</p>
            </div>
            <div className="flex-1 p-4">
              {orderDetail ? (
                <CustomerOrderDetail
                  order={orderDetail}
                  isVatPayer={isVatPayer}
                  orderHref={orderHref}
                  showDeliveryNotes={false}
                  disableTrackingEdit={true}
                />
              ) : (
                <p className="text-sm text-gray-400 italic mt-4">Žádná objednávka nebyla vybrána.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
