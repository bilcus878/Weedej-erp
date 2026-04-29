'use client'

import { useState } from 'react'
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

  function handlePrintPDF(tx: Transaction) {
    if (tx.issuedInvoice?.id) {
      window.open(`/api/invoices/${tx.issuedInvoice.id}/pdf`, '_blank')
    } else {
      alert('Tato transakce nemá přiřazenou fakturu.')
    }
  }

  return { syncing, handleSync, handlePrintPDF }
}
