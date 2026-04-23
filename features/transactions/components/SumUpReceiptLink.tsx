'use client'

import { ExternalLink } from 'lucide-react'
import { parseSumUpReceiptUrl } from '../domain/sumupReceiptUrl'

interface Props { receiptId?: string | null }

export function SumUpReceiptLink({ receiptId }: Props) {
  if (!receiptId) return null
  const url = parseSumUpReceiptUrl(receiptId)
  if (!url) return null
  return (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm flex items-center justify-center gap-4">
      <span className="text-gray-600">SumUp účtenka:</span>
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium flex items-center gap-1">
        Zobrazit <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  )
}
