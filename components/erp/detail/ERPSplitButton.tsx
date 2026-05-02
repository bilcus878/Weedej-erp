'use client'

import React from 'react'

type ButtonColor = 'blue' | 'green' | 'indigo' | 'emerald' | 'red'

const COLOR_CLASSES: Record<ButtonColor, string> = {
  blue:    'bg-blue-600    hover:bg-blue-700    text-white',
  green:   'bg-green-600   hover:bg-green-700   text-white',
  indigo:  'bg-indigo-600  hover:bg-indigo-700  text-white',
  emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  red:     'bg-red-600     hover:bg-red-700     text-white',
}

interface SplitButtonAction {
  label:   string
  icon?:   React.ElementType
  onClick: () => void
}

interface ERPSplitButtonProps {
  /** Primary (left) colored action */
  primary:    SplitButtonAction & { color: ButtonColor }
  /** Secondary (right) gray action — when omitted renders a standalone button */
  secondary?: SplitButtonAction
  disabled?:  boolean
  className?: string
}

/**
 * ERPSplitButton — grouped primary/secondary action button.
 *
 * With secondary: [Primary colored | Secondary gray] — divided, rounded as one unit.
 * Without secondary: standalone colored button.
 */
export function ERPSplitButton({ primary, secondary, disabled = false, className = '' }: ERPSplitButtonProps) {
  const PrimaryIcon   = primary.icon
  const SecondaryIcon = secondary?.icon

  if (!secondary) {
    return (
      <button
        onClick={primary.onClick}
        disabled={disabled}
        className={[
          'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50',
          COLOR_CLASSES[primary.color],
          className,
        ].join(' ')}
      >
        {PrimaryIcon && <PrimaryIcon className="w-3.5 h-3.5" />}
        {primary.label}
      </button>
    )
  }

  return (
    <div className={['flex items-center rounded-lg overflow-hidden shadow-sm', disabled ? 'opacity-50 pointer-events-none' : '', className].join(' ')}>
      <button
        onClick={primary.onClick}
        disabled={disabled}
        className={[
          'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors',
          COLOR_CLASSES[primary.color],
        ].join(' ')}
      >
        {PrimaryIcon && <PrimaryIcon className="w-3.5 h-3.5" />}
        {primary.label}
      </button>
      <button
        onClick={secondary.onClick}
        disabled={disabled}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white hover:bg-gray-50 text-gray-600 border-y border-r border-gray-200 transition-colors"
      >
        {SecondaryIcon && <SecondaryIcon className="w-3.5 h-3.5" />}
        {secondary.label}
      </button>
    </div>
  )
}
