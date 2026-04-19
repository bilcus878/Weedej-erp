import { ReactNode } from 'react'

interface Props {
  label: string
  value?: ReactNode
  mono?: boolean
  className?: string
}

export function DetailRow({ label, value, mono, className = '' }: Props) {
  return (
    <div className={`flex justify-between gap-2 px-4 py-1.5 ${className}`}>
      <span className="text-gray-400 shrink-0 text-xs uppercase tracking-wide font-medium">
        {label}
      </span>
      <span className={`${mono ? 'font-mono' : ''} font-semibold text-gray-900 text-right`}>
        {value ?? <span className="text-gray-400 font-normal">—</span>}
      </span>
    </div>
  )
}
