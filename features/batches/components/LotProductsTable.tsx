'use client'

import Link from 'next/link'
import type { LotProduct } from '../types'
import { BatchStatusBadge } from './BatchStatusBadge'
import { fmt, fmtNum, isExpired, isExpiringSoon } from '../utils'

interface Props {
  products: LotProduct[]
}

export function LotProductsTable({ products }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">Produkty v šarži</h2>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider">
          <tr>
            <th className="px-5 py-3 text-left font-medium">Produkt</th>
            <th className="px-5 py-3 text-left font-medium">Expirace</th>
            <th className="px-5 py-3 text-right font-medium">Na skladě</th>
            <th className="px-5 py-3 text-left font-medium">Status</th>
            <th className="px-5 py-3 text-right font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {products.map(p => {
            const expired  = isExpired(p.expiryDate)
            const expiring = !expired && isExpiringSoon(p.expiryDate)
            return (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5 font-medium text-gray-900">{p.name}</td>
                <td className="px-5 py-3.5">
                  {p.expiryDate ? (
                    <span className={
                      expired  ? 'text-red-600 font-semibold' :
                      expiring ? 'text-amber-600 font-semibold' :
                      'text-gray-600'
                    }>
                      {fmt(p.expiryDate)}
                      {expired  && ' (prošlá)'}
                      {expiring && ' (brzy vyprší)'}
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-3.5 text-right font-mono text-gray-900">
                  {fmtNum(p.currentStock)} <span className="text-gray-400 text-xs">{p.unit}</span>
                </td>
                <td className="px-5 py-3.5">
                  <BatchStatusBadge status={p.status} />
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={`/batches/${p.id}`}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Detail
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
