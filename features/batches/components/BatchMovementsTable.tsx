'use client'

import Link from 'next/link'
import { formatPrice } from '@/lib/shared/finance/money'
import type { BatchMovement } from '../types'

interface Props {
  movements:   BatchMovement[]
  productUnit: string
}

export function BatchMovementsTable({ movements, productUnit }: Props) {
  if (movements.length === 0) {
    return <div className="text-center py-10 text-gray-400 text-sm">Žádné pohyby</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
            <th className="text-left px-5 py-3">Datum</th>
            <th className="text-center px-3 py-3">Typ</th>
            <th className="text-right px-3 py-3">Množství</th>
            <th className="text-left px-3 py-3">Dokument</th>
            <th className="text-left px-3 py-3">Dodavatel</th>
            <th className="text-right px-3 py-3">Nák. cena</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {movements.map(mv => {
            const isIn = Number(mv.quantity) > 0
            const dn   = mv.deliveryNoteItems?.[0]?.deliveryNote

            return (
              <tr key={mv.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-5 py-3 text-gray-700 whitespace-nowrap">
                  {new Date(mv.date).toLocaleDateString('cs-CZ')}
                </td>
                <td className="text-center px-3 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isIn ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {isIn ? 'Příjem' : 'Výdej'}
                  </span>
                </td>
                <td className={`text-right px-3 py-3 font-semibold ${isIn ? 'text-green-700' : 'text-red-600'}`}>
                  {isIn ? '+' : ''}{Number(mv.quantity)} {productUnit}
                </td>
                <td className="px-3 py-3 text-xs">
                  {mv.receipt && (
                    <Link href={`/receipts?highlight=${mv.receipt.id}`} className="text-blue-600 hover:underline font-medium">
                      {mv.receipt.receiptNumber}
                    </Link>
                  )}
                  {dn && (
                    <Link href={`/delivery-notes?highlight=${dn.id}`} className="text-purple-600 hover:underline font-medium">
                      {dn.deliveryNumber}
                    </Link>
                  )}
                  {!mv.receipt && !dn && <span className="text-gray-400">—</span>}
                </td>
                <td className="px-3 py-3 text-xs text-gray-500">
                  {mv.supplier?.name ?? '—'}
                </td>
                <td className="text-right px-3 py-3 text-xs text-gray-500">
                  {mv.purchasePrice ? formatPrice(mv.purchasePrice) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
