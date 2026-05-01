'use client'

import { AlertOctagon } from 'lucide-react'
import { ERPSectionCard, ERPDetailRow } from './ERPSectionCard'

export interface StornoSectionProps {
  stornoAt?:     string | null
  stornoBy?:     string | null
  stornoReason?: string | null
  title?:        string
}

export function StornoSection({ stornoAt, stornoBy, stornoReason, title = 'Storno' }: StornoSectionProps) {
  return (
    <ERPSectionCard title={title} icon={<AlertOctagon />} className="border-red-200">
      <dl>
        <ERPDetailRow
          label="Datum storna"
          value={stornoAt ? new Date(stornoAt).toLocaleDateString('cs-CZ') : null}
        />
        <ERPDetailRow label="Stornoval" value={stornoBy} />
        {stornoReason && <ERPDetailRow label="Důvod" value={stornoReason} />}
      </dl>
    </ERPSectionCard>
  )
}
