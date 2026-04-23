'use client'

import { useState } from 'react'
import { generateInvoicePDF } from '@/lib/generateInvoicePDF'
import { syncTransactions } from '../services/transactionService'
import type { Transaction } from '../types'

export function useTransactionActions(onRefresh: () => Promise<void>) {
  const [syncing, setSyncing] = useState(false)

  async function handleSync(fromDate: string) {
    setSyncing(true)
    try {
      const data = await syncTransactions(fromDate)
      alert(`Synchronizováno ${data.count} nových transakcí`)
      await onRefresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Nepodařilo se synchronizovat transakce')
    } finally {
      setSyncing(false)
    }
  }

  async function handlePrintPDF(tx: Transaction) {
    try {
      const settings = await fetch('/api/settings').then(r => r.json())
      await generateInvoicePDF(tx as any, settings)
    } catch {
      alert('Nepodařilo se vygenerovat PDF faktury')
    }
  }

  return { syncing, handleSync, handlePrintPDF }
}
