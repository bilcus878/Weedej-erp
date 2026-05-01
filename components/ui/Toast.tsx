'use client'

import type { ToastState } from './useToast'

export function Toast({ toast }: { toast: ToastState }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium max-w-sm ${
        toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
      }`}
    >
      {toast.message}
    </div>
  )
}
