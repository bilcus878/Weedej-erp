import { ReactNode } from 'react'

interface Props {
  label: string
  value?: ReactNode
  mono?: boolean
  muted?: boolean
  className?: string
}

export function DetailRow({ label, value, mono, muted, className = '' }: Props) {
  return (
    <div className={`flex justify-between gap-2 ${className}`}>
      <span className="text-gray-400 shrink-0 text-xs uppercase tracking-wide font-medium">
        {label}
      </span>
      <span className={`${mono ? 'font-mono' : ''} ${muted ? 'font-medium text-gray-800' : 'font-semibold text-gray-900'} text-right`}>
        {value ?? <span className="text-gray-400 font-normal">—</span>}
      </span>
    </div>
  )
}
