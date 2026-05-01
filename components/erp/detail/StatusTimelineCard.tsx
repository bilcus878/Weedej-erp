'use client'

import { Clock } from 'lucide-react'
import { ERPSectionCard }    from './ERPSectionCard'
import { ERPStatusTimeline } from './ERPStatusTimeline'
import type { TimelineEntry } from './ERPStatusTimeline'

export interface StatusTimelineCardProps {
  entries:        TimelineEntry[]
  statusConfig?:  Record<string, { label: string; color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'orange' }>
  title?:         string
  relativeTime?:  boolean
  compact?:       boolean
  isLoading?:     boolean
}

export function StatusTimelineCard({
  entries,
  statusConfig,
  title = 'Historie stavů',
  relativeTime = true,
  compact = true,
  isLoading = false,
}: StatusTimelineCardProps) {
  return (
    <ERPSectionCard title={title} icon={<Clock />}>
      <ERPStatusTimeline
        entries={entries}
        statusConfig={statusConfig}
        compact={compact}
        relativeTime={relativeTime}
        isLoading={isLoading}
      />
    </ERPSectionCard>
  )
}
