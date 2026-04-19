import { type LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface Props {
  icon: LucideIcon
  message: string
  subMessage?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, message, subMessage, action }: Props) {
  return (
    <div className="border rounded-lg p-12 text-center">
      <Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500 mb-2">{message}</p>
      {subMessage && <p className="text-xs text-gray-400 mb-4">{subMessage}</p>}
      {action}
    </div>
  )
}
