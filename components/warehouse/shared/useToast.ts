'use client'

import { useState } from 'react'

export interface ToastState {
  type: 'success' | 'error'
  message: string
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  function showToast(type: ToastState['type'], message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), type === 'error' ? 6000 : 4000)
  }

  return { toast, showToast }
}
