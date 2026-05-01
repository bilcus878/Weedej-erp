'use client'

import React      from 'react'
import { Info }   from 'lucide-react'
import { ERPSectionCard, ERPDetailRow } from './ERPSectionCard'

export interface OverviewRow {
  label: string
  value: React.ReactNode
}

export interface DocumentOverviewCardProps {
  rows:       OverviewRow[]
  title?:     string
  isLoading?: boolean
}

export function DocumentOverviewCard({ rows, title = 'Přehled', isLoading = false }: DocumentOverviewCardProps) {
  return (
    <ERPSectionCard title={title} icon={<Info />} isLoading={isLoading}>
      <dl>
        {rows.map((row, i) => (
          <ERPDetailRow key={i} label={row.label} value={row.value} />
        ))}
      </dl>
    </ERPSectionCard>
  )
}
