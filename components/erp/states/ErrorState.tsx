import { XCircle } from 'lucide-react'

interface Props {
  message?:  string
  onRetry?:  () => void
}

export function ErrorState({ message = 'Nepodařilo se načíst data', onRetry }: Props) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-3">
        <XCircle className="w-10 h-10 text-red-400 mx-auto" />
        <p className="text-red-600 font-medium">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Zkusit znovu
          </button>
        )}
      </div>
    </div>
  )
}
