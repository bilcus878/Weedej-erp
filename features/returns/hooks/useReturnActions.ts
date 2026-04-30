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

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    setSaving(true)
    setError(null)
    try {
      const result = await fn()
      return result
    } catch (e: any) {
      setError(e.message ?? 'Chyba')
      return null
    } finally {
      setSaving(false)
    }
  }

  async function transition(id: string, toStatus: ReturnStatus, note?: string) {
    const result = await run(() => transitionStatus(id, { toStatus, note }))
    if (result) onSuccess(result)
  }

  async function approve(id: string, input: ApproveReturnInput) {
    const result = await run(() => approveReturn(id, input))
    if (result) onSuccess(result)
  }

  async function reject(id: string, input: RejectReturnInput) {
    const result = await run(() => rejectReturn(id, input))
    if (result) onSuccess(result)
  }

  async function receiveGoodsAction(id: string, input: ReceiveGoodsInput) {
    const result = await run(() => receiveGoods(id, input))
    if (result) onSuccess(result)
  }

  async function processRefundAction(id: string, input: ProcessRefundInput) {
    const result = await run(() => processRefund(id, input))
    if (result) onSuccess(result)
  }

  async function saveNote(id: string, note: string) {
    await run(() => updateAdminNote(id, note))
  }

  return {
    saving,
    error,
    transition,
    approve,
    reject,
    receiveGoods: receiveGoodsAction,
    processRefund: processRefundAction,
    saveNote,
  }
}
