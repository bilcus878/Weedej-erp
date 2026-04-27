import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import { calcPackCount } from '@/lib/packQuantity'
import { formatVariantQty } from '@/lib/formatVariantQty'
import type { OrderDetailData, OrderDetailItem } from '@/components/erp'
import type { DeliveryNote } from '../types'

export function formatDNItemQty(quantity: number, productName: string | null | undefined, unit: string): string {
  if (productName?.includes(' — ') && unit !== 'ks') {
    const variantLabel = productName.split(' — ').slice(-1)[0]
    const match = variantLabel.match(/^([\d.]+)/)
    if (match) {
      const packSize = parseFloat(match[1])
      if (packSize > 0) {
        const packs = Math.round((quantity / packSize) * 1000) / 1000
        return `${packs}x ${variantLabel}`
      }
    }
  }
  return formatVariantQty(quantity, productName, unit)
}

export function mapDeliveryNoteToOrderDetail(note: DeliveryNote, isVatPayer: boolean): OrderDetailData {
  const productItems = note.items.filter(item => item.productId != null)
  // customerOrder carries all CustomerOrder model fields at runtime via [key: string]: any
  const co = note.customerOrder as any

  const mappedItems: OrderDetailItem[] = productItems.map(item => {
    const hasSaved     = item.price != null && item.priceWithVat != null
    const unitPrice    = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
    const itemVatRate  = hasSaved
      ? Number(item.vatRate ?? DEFAULT_VAT_RATE)
      : Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
    const isItemNonVat = isNonVatPayer(itemVatRate)
    const vatPerUnit   = hasSaved
      ? Number(item.vatAmount ?? 0)
      : (isItemNonVat ? 0 : unitPrice * itemVatRate / 100)
    const priceWithVat = hasSaved ? Number(item.priceWithVat) : (unitPrice + vatPerUnit)
    const packCount    = calcPackCount(Number(item.quantity), item.productName, item.unit)
    const displayUnit  = item.unit !== 'ks' && item.productName?.includes(' — ') ? 'ks' : item.unit
    return {
      id:           item.id,
      productId:    item.productId,
      productName:  item.productName,
      quantity:     packCount,
      unit:         displayUnit,
      price:        unitPrice,
      vatRate:      itemVatRate,
      vatAmount:    vatPerUnit,
      priceWithVat,
      product: item.product
        ? { id: item.product.id, name: item.product.name, price: Number(item.product.price), unit: displayUnit }
        : undefined,
    }
  })

  // Include shipping / discount null-productId items from the linked customer
  // order so CustomerOrderDetail can render the full breakdown (subtotal +
  // shipping row + grand total) and the summary card shows the correct amount.
  const nullOrderItems: OrderDetailItem[] = (co?.items || [])
    .filter((item: any) => item.productId === null)
    .map((item: any) => ({
      id:          item.id,
      productId:   null,
      productName: item.productName,
      quantity:    Number(item.quantity ?? 1),
      unit:        item.unit || 'ks',
      price:       Number(item.price ?? item.priceWithVat ?? 0),
      vatRate:     Number(item.vatRate ?? 21),
      vatAmount:   Number(item.vatAmount ?? 0),
      priceWithVat: Number(item.priceWithVat ?? item.price ?? 0),
      product:     null,
    }))

  const allItems = [...mappedItems, ...nullOrderItems]

  // Use the customer order's total (includes shipping) when available;
  // fall back to calculating from items if there is no linked order.
  const totalAmount = (co?.totalAmount != null && Number(co.totalAmount) > 0)
    ? Number(co.totalAmount)
    : allItems.reduce((sum, item) => sum + item.quantity * (isVatPayer ? item.priceWithVat : item.price), 0)

  const invoice = co?.issuedInvoice || note.issuedInvoice

  return {
    id:          note.id,
    // Show related order number so the link in the summary panel points to the source order.
    // Falls back to the delivery note number if there is no linked order.
    orderNumber: co?.orderNumber || note.deliveryNumber,
    orderDate:   co?.orderDate   || note.deliveryDate,
    // Translate DN status to a value CustomerOrderDetail's getStatusBadge knows.
    status:      note.status === 'storno' ? 'storno' : 'delivered',
    totalAmount,

    paidAt:           co?.paidAt    ? new Date(co.paidAt).toISOString()    : null,
    shippedAt:        co?.shippedAt ? new Date(co.shippedAt).toISOString() : null,
    paymentReference: co?.paymentReference || null,

    customerName:    note.customer?.name || co?.customerName || note.customerName || null,
    customerEmail:   co?.customerEmail   || null,
    customerPhone:   co?.customerPhone   || null,
    customerAddress: co?.customerAddress || null,

    billingName:    co?.billingName    || null,
    billingCompany: co?.billingCompany || null,
    billingIco:     co?.billingIco     || (note.customer as any)?.ico || null,
    billingStreet:  co?.billingStreet  || null,
    billingCity:    co?.billingCity    || null,
    billingZip:     co?.billingZip     || null,
    billingCountry: co?.billingCountry || null,

    // Shipping fields — displayed in the Doručení panel, never affect item totals
    shippingMethod:     co?.shippingMethod     || null,
    pickupPointId:      co?.pickupPointId      || null,
    pickupPointName:    co?.pickupPointName    || null,
    pickupPointAddress: co?.pickupPointAddress || null,
    pickupPointCarrier: co?.pickupPointCarrier || null,
    trackingNumber:     co?.trackingNumber     || null,
    carrier:            co?.carrier            || null,

    items: allItems,

    issuedInvoice: invoice ? {
      id:             invoice.id,
      invoiceNumber:  invoice.invoiceNumber,
      paymentStatus:  (invoice as any).paymentStatus  || 'unknown',
      paymentType:    (invoice as any).paymentType    || null,
      status:         (invoice as any).status         || 'active',
      invoiceDate:    (invoice as any).invoiceDate    || note.deliveryDate,
      dueDate:        (invoice as any).dueDate        || null,
      variableSymbol: (invoice as any).variableSymbol || null,
      constantSymbol: (invoice as any).constantSymbol || null,
      specificSymbol: (invoice as any).specificSymbol || null,
    } : null,

    // Pass the delivery note so CustomerOrderDetail can build inventoryItemId lookup
    deliveryNotes: [{
      id:             note.id,
      deliveryNumber: note.deliveryNumber,
      deliveryDate:   note.deliveryDate,
      status:         note.status === 'storno' ? 'storno' : 'active',
      items:          note.items.map(item => ({
        id:              item.id,
        quantity:        Number(item.quantity),
        unit:            item.unit,
        productId:       item.productId,
        inventoryItemId: item.inventoryItemId || null,
        productName:     item.productName,
        price:           item.price,
        priceWithVat:    item.priceWithVat,
        vatRate:         item.vatRate,
        vatAmount:       item.vatAmount,
        product:         item.product,
      })),
    }],
  }
}
