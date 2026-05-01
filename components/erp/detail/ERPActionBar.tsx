'use client'

/**
 * ERPActionBar — sticky action bar for ERP detail pages.
 *
 * Features:
 *  - Actions array with full type safety
 *  - Per-action confirm dialog (prevents accidental destructive actions)
 *  - Loading state (disables all buttons while a mutation is in flight)
 *  - RBAC gate per action (requiredPermission)
 *  - Renders as a horizontal bar on desktop, full-width stacked on mobile
 *  - Primary/secondary/danger/ghost variants
 *  - Separator support for visual grouping
 */

import React, { Fragment, useState } from 'react'
import { useSession }                from 'next-auth/react'
import { Loader2 }                   from 'lucide-react'

// ── Action definition ─────────────────────────────────────────────────────────

export interface ERPAction {
  /** Button label */
  label:              string
  /** Click handler — should be async, returns void or Promise<void> */
  onClick:            () => void | Promise<void>
  /** Visual variant */
  variant?:           'primary' | 'secondary' | 'danger' | 'ghost'
  /** Disable the button */
  disabled?:          boolean
  /** Tooltip / aria-label */
  title?:             string
  /** Optional Lucide icon */
  icon?:              React.ReactNode
  /** If set, show a confirmation dialog before calling onClick */
  confirm?:           ConfirmOptions
  /** Required permission — action is hidden if user lacks it */
  requiredPermission?: string
  /** Visual separator BEFORE this action */
  separator?:         boolean
  /** Show a loading spinner instead of the icon */
  loading?:           boolean
}

interface ConfirmOptions {
  title:   string
  message: string
  confirmLabel?: string
  cancelLabel?:  string
  variant?:      'danger' | 'default'
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ERPActionBarProps {
  actions:        ERPAction[]
  /** Global loading state — disables all buttons */
  isLoading?:     boolean
  /** Renders bar inline (no sticky positioning) */
  inline?:        boolean
  className?:     string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ERPActionBar({
  actions,
  isLoading = false,
  inline = false,
  className = '',
}: ERPActionBarProps) {
  const { data: session }              = useSession()
  const [pendingConfirm, setPending]   = useState<ERPAction | null>(null)
  const [executingId, setExecutingId]  = useState<string | null>(null)

  const permissions: string[] = (session?.user as any)?.permissions ?? []

  const visibleActions = actions.filter(
    a => !a.requiredPermission || permissions.includes(a.requiredPermission)
  )

  const handleClick = async (action: ERPAction) => {
    if (action.confirm) {
      setPending(action)
      return
    }
    await runAction(action)
  }

  const runAction = async (action: ERPAction) => {
    const id = action.label
    setExecutingId(id)
    try {
      await action.onClick()
    } finally {
      setExecutingId(null)
    }
  }

  const confirmAndRun = async () => {
    if (!pendingConfirm) return
    const action = pendingConfirm
    setPending(null)
    await runAction(action)
  }

  return (
    <>
      {/* ── Action bar ──────────────────────────────────────────────────── */}
      <div
        className={[
          inline ? '' : 'sticky bottom-0 z-20',
          'bg-white border-t border-gray-200 shadow-md',
          className,
        ].join(' ')}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-2 justify-end">
          {visibleActions.map((action, i) => (
            <Fragment key={i}>
              {action.separator && i > 0 && (
                <div className="h-8 w-px bg-gray-200 hidden sm:block" aria-hidden="true" />
              )}
              <ActionButton
                action={action}
                isGloballyLoading={isLoading}
                isExecuting={executingId === action.label}
                onClick={() => handleClick(action)}
              />
            </Fragment>
          ))}
        </div>
      </div>

      {/* ── Confirm dialog ───────────────────────────────────────────────── */}
      {pendingConfirm && (
        <ConfirmDialog
          options={pendingConfirm.confirm!}
          onConfirm={confirmAndRun}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  )
}

// ── Action button ─────────────────────────────────────────────────────────────

const VARIANT_CLASSES: Record<string, string> = {
  primary:   'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-300',
  danger:    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  ghost:     'bg-transparent text-gray-600 hover:bg-gray-100 focus-visible:ring-gray-300',
}

function ActionButton({
  action,
  isGloballyLoading,
  isExecuting,
  onClick,
}: {
  action:              ERPAction
  isGloballyLoading:   boolean
  isExecuting:         boolean
  onClick:             () => void
}) {
  const variant = action.variant ?? 'secondary'
  const busy    = isGloballyLoading || isExecuting || action.loading
  const disabled = busy || action.disabled

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={action.title}
      aria-label={action.title ?? action.label}
      className={[
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.secondary,
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
    >
      {(isExecuting || action.loading) ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : action.icon ? (
        <span className="w-4 h-4" aria-hidden="true">{action.icon}</span>
      ) : null}
      {action.label}
    </button>
  )
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  options,
  onConfirm,
  onCancel,
}: {
  options:   ConfirmOptions
  onConfirm: () => void
  onCancel:  () => void
}) {
  const isDanger = options.variant === 'danger'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="space-y-2">
          <h3 id="confirm-title" className="text-base font-semibold text-gray-900">
            {options.title}
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            {options.message}
          </p>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600
                       border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            {options.cancelLabel ?? 'Zrušit'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              isDanger
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700',
            ].join(' ')}
          >
            {options.confirmLabel ?? 'Potvrdit'}
          </button>
        </div>
      </div>
    </div>
  )
}
