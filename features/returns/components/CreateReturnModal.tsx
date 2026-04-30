'use client'

import { XCircle, Search, Loader2, AlertCircle, ChevronRight, ChevronLeft, CheckSquare, Square } from 'lucide-react'
import { useCreateReturn } from '../hooks/useCreateReturn'
import { RETURN_TYPE_LABELS, RETURN_REASON_LABELS } from '@/lib/returns/returnWorkflow'
import type { ReturnType as ReturnRequestType, ReturnReason } from '../types'

const inp = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400'
const sel = `${inp} bg-white`

// ── Step indicator ────────────────────────────────────────────────────────────

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Objednávka', 'Položky', 'Detail']
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((label, i) => {
        const n    = (i + 1) as 1 | 2 | 3
        const done = step > n
        const cur  = step === n
        return (
          <div key={label} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              cur  ? 'bg-rose-600 text-white' :
              done ? 'bg-rose-100 text-rose-700' :
                     'text-gray-400'
            }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                cur  ? 'bg-white text-rose-600' :
                done ? 'bg-rose-500 text-white' :
                       'bg-gray-200 text-gray-500'
              }`}>{n}</span>
              {label}
            </div>
            {i < 2 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 mx-1" />}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1: Order search ──────────────────────────────────────────────────────

function Step1({ s }: { s: ReturnType<typeof useCreateReturn> }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Vyhledejte objednávku zákazníka. Informace o zákazníkovi a položky budou předvyplněny automaticky.</p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          autoFocus
          value={s.orderSearch}
          onChange={e => s.setOrderSearch(e.target.value)}
          placeholder="Číslo objednávky..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
        {s.searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
      </div>

      <div className="space-y-1 max-h-80 overflow-y-auto">
        {s.orders.length === 0 && !s.searchLoading && (
          <p className="text-center text-sm text-gray-400 py-8">
            {s.orderSearch ? 'Žádná objednávka nenalezena' : 'Zadejte číslo objednávky'}
          </p>
        )}
        {s.orders.map(order => (
          <button
            key={order.id}
            onClick={() => s.selectOrder(order)}
            className="w-full text-left px-4 py-3 rounded-xl border border-gray-100 hover:border-rose-300 hover:bg-rose-50/50 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono font-semibold text-sm text-gray-900 group-hover:text-rose-700">
                  {order.orderNumber}
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  {new Date(order.orderDate).toLocaleDateString('cs-CZ')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-700">
                  {order.totalAmount.toLocaleString('cs-CZ')} Kč
                </span>
                <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {order.items.length} pol.
                </span>
              </div>
            </div>
            {order.customerName && (
              <p className="text-xs text-gray-400 mt-0.5">{order.customerName}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Step 2: Item selection ────────────────────────────────────────────────────

function Step2({ s }: { s: ReturnType<typeof useCreateReturn> }) {
  const order = s.selectedOrder!
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Vyberte položky k reklamaci a zadejte vrácené množství.
        </p>
        <span className="text-xs text-gray-400 font-mono">{order.orderNumber}</span>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
              <th className="px-4 py-2.5 text-left w-8"></th>
              <th className="px-4 py-2.5 text-left">Produkt</th>
              <th className="px-3 py-2.5 text-right">Objednáno</th>
              <th className="px-3 py-2.5 text-right">Vrací se</th>
              <th className="px-3 py-2.5 text-right">Cena / ks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map(item => {
              const sel     = s.selections.get(item.id)!
              const checked = sel?.checked ?? false
              return (
                <tr key={item.id} className={`transition-colors ${checked ? 'bg-white' : 'bg-gray-50/60 opacity-60'}`}>
                  <td className="px-4 py-3">
                    <button onClick={() => s.toggleItem(item.id)} className="text-rose-500">
                      {checked
                        ? <CheckSquare className="w-4 h-4" />
                        : <Square      className="w-4 h-4 text-gray-300" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {item.productName ?? '—'}
                    <span className="text-xs text-gray-400 ml-1">{item.unit}</span>
                  </td>
                  <td className="px-3 py-3 text-right text-gray-500 tabular-nums">
                    {item.quantity}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <input
                      type="number"
                      min={0.001}
                      max={item.quantity}
                      step="any"
                      value={sel?.qty ?? item.quantity}
                      disabled={!checked}
                      onChange={e => s.setItemQty(item.id, parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-lg text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </td>
                  <td className="px-3 py-3 text-right text-gray-500 tabular-nums text-xs">
                    {(item.priceWithVat ?? item.price).toLocaleString('cs-CZ')} Kč
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {s.selectedCount === 0 && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          Vyberte alespoň jednu položku s množstvím větším než 0.
        </p>
      )}
    </div>
  )
}

// ── Step 3: Return details ────────────────────────────────────────────────────

function Step3({ s }: { s: ReturnType<typeof useCreateReturn> }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Typ reklamace</label>
          <select value={s.type} onChange={e => s.setType(e.target.value as ReturnRequestType)} className={sel}>
            {(Object.entries(RETURN_TYPE_LABELS) as [ReturnRequestType, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Důvod</label>
          <select value={s.reason} onChange={e => s.setReason(e.target.value as ReturnReason)} className={sel}>
            {(Object.entries(RETURN_REASON_LABELS) as [ReturnReason, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Popis problému <span className="text-gray-400 font-normal">(volitelně)</span></label>
        <textarea
          value={s.reasonDetail}
          onChange={e => s.setReasonDetail(e.target.value)}
          rows={3}
          placeholder="Podrobný popis závady nebo důvodu reklamace..."
          className={`${inp} resize-none`}
        />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Kontaktní informace zákazníka</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Jméno</label>
            <input value={s.custName}  onChange={e => s.setCustName(e.target.value)}  className={inp} placeholder="Jméno zákazníka" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">E-mail</label>
            <input value={s.custEmail} onChange={e => s.setCustEmail(e.target.value)} className={inp} placeholder="email@example.com" type="email" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Telefon</label>
            <input value={s.custPhone} onChange={e => s.setCustPhone(e.target.value)} className={inp} placeholder="+420 123 456 789" />
          </div>
        </div>
      </div>

      {s.error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {s.error}
        </div>
      )}
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

const TITLES: Record<1 | 2 | 3, string> = {
  1: 'Nová reklamace — Vyberte objednávku',
  2: 'Nová reklamace — Položky k vrácení',
  3: 'Nová reklamace — Detail',
}

export function CreateReturnModal({ onClose }: Props) {
  const s = useCreateReturn(onClose)

  const canNext2 = !!s.selectedOrder
  const canNext3 = s.selectedCount > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900">{TITLES[s.step]}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          <StepBar step={s.step} />
          {s.step === 1 && <Step1 s={s} />}
          {s.step === 2 && <Step2 s={s} />}
          {s.step === 3 && <Step3 s={s} />}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          <button
            onClick={() => s.setStep(s.step > 1 ? (s.step - 1) as 1 | 2 | 3 : s.step)}
            disabled={s.step === 1}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-0 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Zpět
          </button>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
              Zrušit
            </button>

            {s.step < 3 && (
              <button
                onClick={() => s.setStep((s.step + 1) as 2 | 3)}
                disabled={s.step === 1 ? !canNext2 : !canNext3}
                className="flex items-center gap-1.5 text-sm px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Pokračovat
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {s.step === 3 && (
              <button
                onClick={s.submit}
                disabled={s.submitting || s.selectedCount === 0}
                className="flex items-center gap-2 text-sm px-5 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {s.submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {s.submitting ? 'Ukládám...' : 'Vytvořit reklamaci'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
