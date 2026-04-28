'use client'

import { Send, ShoppingCart, Receipt, Package, CheckCircle2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface WorkItemProps {
  icon:     React.ReactNode
  label:    string
  count:    number | null
  amount?:  number
  sub:      string
  href:     string
  urgent?:  boolean
}

function WorkItem({ icon, label, count, amount, sub, href, urgent }: WorkItemProps) {
  const hasWork = (count !== null && count > 0) || (amount !== undefined && amount > 0)
  const accentCls = hasWork && urgent
    ? 'border-red-200 bg-red-50 hover:bg-red-100'
    : hasWork
    ? 'border-orange-200 bg-orange-50 hover:bg-orange-100'
    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
  const valueCls = hasWork && urgent
    ? 'text-red-600'
    : hasWork
    ? 'text-orange-600'
    : 'text-gray-400'
  const iconCls = hasWork && urgent
    ? 'bg-red-100 text-red-500'
    : hasWork
    ? 'bg-orange-100 text-orange-600'
    : 'bg-gray-100 text-gray-400'

  return (
    <a
      href={href}
      className={`flex flex-col gap-3 p-4 rounded-xl border transition-colors ${accentCls}`}
    >
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${iconCls}`}>
          {icon}
        </div>
        {hasWork ? (
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
            urgent ? 'bg-red-200 text-red-700' : 'bg-orange-200 text-orange-700'
          }`}>
            Akce
          </span>
        ) : (
          <CheckCircle2 className="h-4 w-4 text-gray-300" />
        )}
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</p>
        {amount !== undefined ? (
          <p className={`text-xl font-bold leading-tight ${valueCls}`}>
            {amount > 0 ? formatPrice(amount) : '—'}
          </p>
        ) : (
          <p className={`text-3xl font-bold leading-tight ${valueCls}`}>
            {count !== null && count > 0 ? count : '—'}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">{sub}</p>
      </div>

      <div className={`text-xs font-semibold mt-auto ${hasWork ? (urgent ? 'text-red-600' : 'text-orange-600') : 'text-gray-400'}`}>
        {hasWork ? 'Zpracovat →' : 'Vše vyřízeno ✓'}
      </div>
    </a>
  )
}

interface Props {
  pendingShipmentsCount: number
  newOrdersCount:        number
  outstandingAmount:     number
  outstandingCount:      number
  lowStockCount:         number
  outOfStockCount:       number
}

export function ActionCenterCard({
  pendingShipmentsCount,
  newOrdersCount,
  outstandingAmount,
  outstandingCount,
  lowStockCount,
  outOfStockCount,
}: Props) {
  const stockAlerts = lowStockCount + outOfStockCount
  const allClear    = pendingShipmentsCount === 0 && newOrdersCount === 0 && outstandingAmount === 0 && stockAlerts === 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-gray-900">Čeká na akci</span>
          {!allClear && (
            <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
              {[pendingShipmentsCount, newOrdersCount, outstandingCount, stockAlerts].filter(n => n > 0).length} oblasti
            </span>
          )}
        </div>
        {allClear && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Vše je vyřízeno
          </span>
        )}
      </div>

      <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <WorkItem
          icon={<Send className="h-4 w-4" />}
          label="K expedici"
          count={pendingShipmentsCount}
          sub={pendingShipmentsCount > 0
            ? `${pendingShipmentsCount} objednávek čeká na vyskladnění`
            : 'Všechny objednávky expedovány'}
          href="/delivery-notes"
          urgent={false}
        />
        <WorkItem
          icon={<ShoppingCart className="h-4 w-4" />}
          label="Nové objednávky"
          count={newOrdersCount}
          sub={newOrdersCount > 0
            ? `${newOrdersCount} neproces. zákaznických objednávek`
            : 'Všechny objednávky zpracovány'}
          href="/customer-orders"
          urgent={false}
        />
        <WorkItem
          icon={<Receipt className="h-4 w-4" />}
          label="Pohledávky"
          count={outstandingCount}
          amount={outstandingAmount}
          sub={outstandingCount > 0
            ? `${outstandingCount} nezaplacených faktur`
            : 'Žádné otevřené pohledávky'}
          href="/invoices/issued"
          urgent={outstandingAmount > 50_000}
        />
        <WorkItem
          icon={<Package className="h-4 w-4" />}
          label="Stav skladu"
          count={stockAlerts}
          sub={stockAlerts > 0
            ? `${outOfStockCount} vyprodáno · ${lowStockCount} nízký stav`
            : 'Všechny zásoby v pořádku'}
          href="/inventory"
          urgent={outOfStockCount > 0}
        />
      </div>
    </div>
  )
}
