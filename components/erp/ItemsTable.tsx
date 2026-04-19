import { formatPrice } from '@/lib/utils'
import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'

export interface ErpItem {
  id: string
  productName?: string | null
  product?: { id?: string; name: string } | null
  quantity: number
  unit?: string | null
  price?: number | null
  vatRate?: number | null
  vatAmount?: number | null
  priceWithVat?: number | null
  expectedPrice?: number | null
}

interface Props {
  items: ErpItem[]
  isVatPayer: boolean
  title?: string
  totalAmount?: number
  showNegative?: boolean
  formatQty?: (qty: number, unit?: string | null) => string
}

function defaultFmtQty(qty: number, unit?: string | null) {
  return `${qty}${unit ? ` ${unit}` : ''}`
}

export function ItemsTable({ items, isVatPayer, title, totalAmount, showNegative, formatQty = defaultFmtQty }: Props) {
  const colGrid   = isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'
  const labelSpan = isVatPayer ? 'col-span-6' : 'col-span-3'

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">
        {title ?? `Položky (${items.length})`}
      </h4>
      <div className="text-sm">

        {/* Header */}
        {isVatPayer ? (
          <div className="grid grid-cols-[3fr_repeat(6,1fr)] gap-2 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b text-xs">
            <div>Produkt</div>
            <div className="text-center">Množství</div>
            <div className="text-center">DPH</div>
            <div className="text-center">Cena/ks</div>
            <div className="text-center">DPH/ks</div>
            <div className="text-center">S DPH/ks</div>
            <div className="text-center">Celkem</div>
          </div>
        ) : (
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b">
            <div>Produkt</div>
            <div className="text-right">Množství</div>
            <div className="text-right">Cena za kus</div>
            <div className="text-right">Celkem</div>
          </div>
        )}

        {/* Rows */}
        {items.map((item, i) => {
          const name         = item.product?.name || item.productName || '(Neznámé)'
          const unitPrice    = Number(item.price ?? item.expectedPrice ?? 0)
          const itemVatRate  = Number(item.vatRate ?? DEFAULT_VAT_RATE)
          const isNonVat     = isNonVatPayer(itemVatRate)
          const vatPerUnit   = item.vatAmount != null
            ? Number(item.vatAmount)
            : (isNonVat ? 0 : unitPrice * itemVatRate / 100)
          const withVatUnit  = item.priceWithVat != null
            ? Number(item.priceWithVat)
            : (unitPrice + vatPerUnit)
          const qty          = Number(item.quantity)
          const rowTotal     = isVatPayer ? withVatUnit * qty : unitPrice * qty

          const totalCell = showNegative
            ? <span className="text-red-600">-{formatPrice(rowTotal)}</span>
            : <span className="font-semibold text-gray-900">{formatPrice(rowTotal)}</span>

          return isVatPayer ? (
            <div key={item.id} className={`grid grid-cols-[3fr_repeat(6,1fr)] gap-2 px-4 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} text-xs`}>
              <div className="font-medium text-gray-900">{name}</div>
              <div className="text-center text-gray-600">{formatQty(qty, item.unit)}</div>
              <div className="text-center text-gray-500">{isNonVat ? '-' : `${itemVatRate}%`}</div>
              <div className="text-center text-gray-600">{formatPrice(unitPrice)}</div>
              <div className="text-center text-gray-500">{isNonVat ? '-' : formatPrice(vatPerUnit)}</div>
              <div className="text-center text-gray-700">{formatPrice(withVatUnit)}</div>
              <div className="text-center">{totalCell}</div>
            </div>
          ) : (
            <div key={item.id} className={`grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 px-4 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
              <div className="font-medium text-gray-900">{name}</div>
              <div className="text-right text-gray-600">{formatQty(qty, item.unit)}</div>
              <div className="text-right text-gray-600">{formatPrice(unitPrice)}</div>
              <div className="text-right">{totalCell}</div>
            </div>
          )
        })}

        {/* Total row */}
        {totalAmount != null && (
          <div className={`grid ${colGrid} gap-2 px-4 py-2 bg-gray-100 font-bold border-t text-sm`}>
            <div className={labelSpan}>
              {isVatPayer
                ? (showNegative ? 'Celková částka dobropisu (s DPH)' : 'Celková částka s DPH')
                : (showNegative ? 'Celková částka dobropisu'          : 'Celková částka')}
            </div>
            <div className={`${isVatPayer ? 'text-center' : 'text-right'} ${showNegative ? 'text-red-600' : ''}`}>
              {formatPrice(totalAmount)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
