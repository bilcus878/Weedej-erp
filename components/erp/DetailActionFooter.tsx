'use client'

import { type ReactNode } from 'react'
import Link from 'next/link'
import { FileDown, Package, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { ActionToolbar } from './ActionToolbar'
import Button from '@/components/ui/Button'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocumentFlow = 'outgoing' | 'incoming'

interface Props {
  flow?: DocumentFlow

  // PDF / document view button — always in left group
  onPrintPdf?: () => void
  printLabel?: string            // default: 'Zobrazit PDF'

  // Inventory button — left group, directly after PDF
  // Outgoing (flow='outgoing'): label = 'Vyskladnit', default href = '/delivery-notes'
  // Incoming (flow='incoming'): label = 'Naskladnit', default href = '/receipts'
  showInventory?: boolean
  inventoryHref?: string         // override default link target
  onInventory?: () => void       // use a click handler instead of a link

  // Delivery confirmation — left group, after inventory button
  showDelivered?: boolean
  onDelivered?: () => void
  processingStatus?: boolean

  // Destructive action — always isolated in right group
  showStorno?: boolean
  onStorno?: () => void
  stornoLabel?: string           // default: 'Storno'

  // Escape hatches for page-specific buttons
  extraLeft?: ReactNode
  extraRight?: ReactNode
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DetailActionFooter({
  flow,
  onPrintPdf,
  printLabel = 'Zobrazit PDF',
  showInventory,
  inventoryHref,
  onInventory,
  showDelivered,
  onDelivered,
  processingStatus,
  showStorno,
  onStorno,
  stornoLabel = 'Storno',
  extraLeft,
  extraRight,
}: Props) {
  const inventoryLabel = flow === 'incoming' ? 'Naskladnit' : 'Vyskladnit'
  const defaultInventoryHref = flow === 'incoming' ? '/receipts' : '/delivery-notes'
  const resolvedInventoryHref = inventoryHref ?? defaultInventoryHref

  const hasLeft = onPrintPdf || (showInventory && (onInventory || flow)) || (showDelivered && onDelivered) || extraLeft
  const hasRight = (showStorno && onStorno) || extraRight
  if (!hasLeft && !hasRight) return null

  return (
    <ActionToolbar
      left={
        <>
          {onPrintPdf && (
            <Button size="sm" variant="secondary" onClick={e => { e.stopPropagation(); onPrintPdf() }}>
              <FileDown className="w-4 h-4 mr-1" />
              {printLabel}
            </Button>
          )}

          {showInventory && (onInventory ? (
            <button
              onClick={e => { e.stopPropagation(); onInventory() }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-medium rounded-lg transition-colors"
            >
              <Package className="w-3.5 h-3.5" />
              {inventoryLabel}
            </button>
          ) : (
            <Link
              href={resolvedInventoryHref}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-medium rounded-lg transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <Package className="w-3.5 h-3.5" />
              {inventoryLabel}
              <ExternalLink className="w-3 h-3" />
            </Link>
          ))}

          {showDelivered && onDelivered && (
            <button
              onClick={e => { e.stopPropagation(); onDelivered() }}
              disabled={processingStatus}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {processingStatus ? 'Zpracovává se...' : 'Doručeno'}
            </button>
          )}

          {extraLeft}
        </>
      }
      right={
        <>
          {extraRight}
          {showStorno && onStorno && (
            <button
              onClick={e => { e.stopPropagation(); onStorno() }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 text-xs font-medium rounded-lg transition-colors border border-red-200"
            >
              <XCircle className="w-3.5 h-3.5" />
              {stornoLabel}
            </button>
          )}
        </>
      }
    />
  )
}
