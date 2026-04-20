import { RefreshCw } from 'lucide-react'

interface Props {
  message?: string
}

export function LoadingState({ message = 'Načítání...' }: Props) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
        <p className="text-gray-500">{message}</p>
      </div>
    </div>
  )
}
