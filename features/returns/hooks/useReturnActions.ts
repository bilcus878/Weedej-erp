'use client'

import { useState } from 'react'
import {
  transitionStatus,
  approveReturn,
  rejectReturn,
  receiveGoods,
  processRefund,
  updateAdminNote,
} from '../services/returnService'
import type {
  ReturnRequestDetail,
  ReturnStatus,
  ApproveReturnInput,
  RejectReturnInput,
  ReceiveGoodsInput,
  ProcessRefundInput,
} from '../types'

export function useReturnActions(onSuccess: (updated: ReturnRequestDetail) => void) {
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  // Returns true on success, false on failure.
  // Callers (modals) MUST check the return value before closing.
  async function run<T>(
    fn:        () => Promise<T>,
    onResult?: (r: T) => void,
  ): Promise<boolean> {
    setSaving(true)
    setError(null)
    try {
      const result = await fn()
      onResult?.(result)
      return true
    } catch (e: any) {
      setError(e.message ?? 'Nastala neočekávaná chyba')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function transition(id: string, toStatus: ReturnStatus, note?: string): Promise<boolean> {
    return run(
      () => transitionStatus(id, { toStatus, note }),
      r  => onSuccess(r),
    )
  }

  async function approve(id: string, input: ApproveReturnInput): Promise<boolean> {
    return run(
      () => approveReturn(id, input),
      r  => onSuccess(r),
    )
  }

  async function reject(id: string, input: RejectReturnInput): Promise<boolean> {
    return run(
      () => rejectReturn(id, input),
      r  => onSuccess(r),
    )
  }

  async function receiveGoodsAction(id: string, input: ReceiveGoodsInput): Promise<boolean> {
    return run(
      () => receiveGoods(id, input),
      r  => onSuccess(r),
    )
  }

  async function processRefundAction(id: string, input: ProcessRefundInput): Promise<boolean> {
    return run(
      () => processRefund(id, input),
      r  => onSuccess(r),
    )
  }

  async function saveNote(id: string, note: string): Promise<boolean> {
    return run(() => updateAdminNote(id, note))
  }

  return {
    saving,
    error,
    clearError: () => setError(null),
    transition,
    approve,
    reject,
    receiveGoods: receiveGoodsAction,
    processRefund: processRefundAction,
    saveNote,
  }
}
