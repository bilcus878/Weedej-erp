'use client'

import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react'
import type { Toast } from '../types'

interface Props {
  toasts:       Toast[]
  onDismiss:    (id: number) => void
}

export function ToastContainer({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm animate-slide-in-right min-w-[300px] ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />}
          {toast.type === 'error'   && <XCircle      className="h-5 w-5 text-red-500 flex-shrink-0" />}
          {toast.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />}
          <span className="text-sm font-medium flex-1">{toast.message}</span>
          <button onClick={() => onDismiss(toast.id)} className="text-current opacity-50 hover:opacity-100 transition-opacity">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
