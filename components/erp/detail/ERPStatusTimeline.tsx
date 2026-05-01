'use client'

/**
 * ERPStatusTimeline — visual status history timeline for ERP detail pages.
 *
 * Renders an ordered list of status transitions:
 *   submitted → inspecting → approved → resolved
 *
 * Features:
 *  - Vertical connecting line between steps
 *  - Current status highlighted
 *  - Actor name + timestamp per step
 *  - Optional note per step
 *  - Compact mode for sidebar use
 *  - Color-coded status dots (configurable via statusColors prop)
 *  - Skeleton loading state
 */

import React              from 'react'
import { formatDistance } from 'date-fns'
import { cs }             from 'date-fns/locale'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TimelineEntry {
  id?:           string
  fromStatus?:   string | null
  toStatus:      string
  changedAt:     string | Date
  changedByName?: string | null
  note?:         string | null
  /** Optional human-readable label override for the status */
  statusLabel?:  string
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ERPStatusTimelineProps {
  entries:       TimelineEntry[]
  /** Map from status code → { label, color } */
  statusConfig?: Record<string, { label: string; color: StatusColor }>
  /** Compact rendering — smaller text, tighter spacing */
  compact?:      boolean
  /** Show skeleton rows */
  isLoading?:    boolean
  /** Show times relative to now ("5 minutes ago") vs absolute */
  relativeTime?:  boolean
}

type StatusColor = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'orange'

// ── Dot color map ─────────────────────────────────────────────────────────────

const DOT_CLASSES: Record<StatusColor, string> = {
  blue:   'bg-blue-500   ring-blue-100',
  green:  'bg-green-500  ring-green-100',
  yellow: 'bg-yellow-400 ring-yellow-100',
  red:    'bg-red-500    ring-red-100',
  gray:   'bg-gray-400   ring-gray-100',
  purple: 'bg-purple-500 ring-purple-100',
  orange: 'bg-orange-400 ring-orange-100',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ERPStatusTimeline({
  entries,
  statusConfig = {},
  compact = false,
  isLoading = false,
  relativeTime = false,
}: ERPStatusTimelineProps) {
  if (isLoading) {
    return <TimelineSkeleton compact={compact} />
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        Žádná historie stavů
      </p>
    )
  }

  return (
    <ol
      className={[
        'relative',
        compact ? 'space-y-3' : 'space-y-4',
      ].join(' ')}
      aria-label="Historie stavů"
    >
      {entries.map((entry, i) => {
        const isLast = i === entries.length - 1
        const cfg    = statusConfig[entry.toStatus]
        const color: StatusColor = cfg?.color ?? 'gray'
        const label = entry.statusLabel ?? cfg?.label ?? entry.toStatus

        const timestamp = typeof entry.changedAt === 'string'
          ? new Date(entry.changedAt)
          : entry.changedAt

        const timeDisplay = relativeTime
          ? formatDistance(timestamp, new Date(), { addSuffix: true, locale: cs })
          : timestamp.toLocaleString('cs-CZ', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })

        return (
          <li key={entry.id ?? i} className="relative flex gap-3">
            {/* Vertical connector */}
            {!isLast && (
              <div
                className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-gray-200"
                aria-hidden="true"
              />
            )}

            {/* Status dot */}
            <div className="shrink-0 mt-0.5">
              <span
                className={[
                  'block w-4.5 h-4.5 rounded-full ring-4',
                  DOT_CLASSES[color],
                  compact ? 'w-3.5 h-3.5' : 'w-4 h-4',
                ].join(' ')}
                aria-hidden="true"
              />
            </div>

            {/* Content */}
            <div className={[
              'flex-1 min-w-0 pb-2',
              compact ? 'text-xs' : 'text-sm',
            ].join(' ')}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-semibold text-gray-800">{label}</span>
                {entry.changedByName && (
                  <span className="text-gray-400">· {entry.changedByName}</span>
                )}
              </div>
              <time
                dateTime={timestamp.toISOString()}
                className="text-gray-400 block mt-0.5"
                title={timestamp.toLocaleString('cs-CZ')}
              >
                {timeDisplay}
              </time>
              {entry.note && (
                <p className="mt-1 text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5 italic">
                  {entry.note}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TimelineSkeleton({ compact }: { compact: boolean }) {
  return (
    <ol className={`relative animate-pulse ${compact ? 'space-y-3' : 'space-y-4'}`}>
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex gap-3">
          <div className="shrink-0 mt-1 w-4 h-4 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-1.5 pb-2">
            <div className="h-3.5 bg-gray-200 rounded w-32" />
            <div className="h-3 bg-gray-100 rounded w-24" />
          </div>
        </li>
      ))}
    </ol>
  )
}

// ── Status badge helper ───────────────────────────────────────────────────────
// Small reusable badge to render status inline in headers.

const BADGE_CLASSES: Record<StatusColor, string> = {
  blue:   'bg-blue-50   text-blue-700   ring-blue-200',
  green:  'bg-green-50  text-green-700  ring-green-200',
  yellow: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  red:    'bg-red-50    text-red-700    ring-red-200',
  gray:   'bg-gray-100  text-gray-600   ring-gray-200',
  purple: 'bg-purple-50 text-purple-700 ring-purple-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
}

interface ERPStatusBadgeProps {
  label:      string
  color?:     StatusColor
  size?:      'sm' | 'md'
  className?: string
}

export function ERPStatusBadge({
  label,
  color = 'gray',
  size  = 'md',
  className = '',
}: ERPStatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center font-medium rounded-full ring-1',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        BADGE_CLASSES[color] ?? BADGE_CLASSES.gray,
        className,
      ].join(' ')}
    >
      {label}
    </span>
  )
}
