'use client'

import Link from 'next/link'
import type { LotMovement } from '../types'
import { fmt, fmtNum } from '../utils'

interface Props {
  movements: LotMovement[]
}

export function LotMovementsTable({ movements }: Props) {
  if (movements.length === 0) {
    return <p className="px-5 py-8 text-sm text-gray-400 text-center">Žádné pohyby</p>
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider">
        <tr>
          <th className="px-5 py-3 text-left font-medium">Datum</th>
          <th className="px-5 py-3 text-left font-medium">Produkt</th>
          <th className="px-5 py-3 text-right font-medium">Množství</th>
          <th className="px-5 py-3 text-left font-medium">Doklad</th>
          <th className="px-5 py-3 text-left font-medium">Poznámka</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {movements.map(m => {
          const isOut = m.quantity < 0
          const doc   = m.receipt
            ? { label: m.receipt.receiptNumber,                href: `/receipts/${m.receipt.id}` }
            : m.deliveryNoteItems?.[0]?.deliveryNote
            ? { label: m.deliveryNoteItems[0].deliveryNote!.deliveryNumber, href: `/delivery-notes/${m.deliveryNoteItems[0].deliveryNote!.id}` }
            : null

          return (
            <tr key={m.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{fmt(m.date)}</td>
              <td className="px-5 py-3 text-gray-700">{m.productName}</td>
              <td className={`px-5 py-3 text-right font-mono font-semibold ${isOut ? 'text-red-600' : 'text-green-700'}`}>
                {isOut ? '' : '+'}{fmtNum(m.quantity)} <span className="text-gray-400 font-normal text-xs">{m.unit}</span>
              </td>
              <td className="px-5 py-3">
                {doc
                  ? <Link href={doc.href} className="text-blue-600 hover:underline font-mono text-xs">{doc.label}</Link>
                  : <span className="text-gray-300">—</span>
                }
              </td>
              <td className="px-5 py-3 text-gray-500 max-w-xs truncate">{m.note ?? '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
