import type { Transaction } from '../types'

export async function fetchTransactions(): Promise<Transaction[]> {
  const res = await fetch('/api/transactions')
  if (!res.ok) throw new Error('Nepodařilo se načíst transakce')
  const data = await res.json()
  return data.transactions || data
}

export async function syncTransactions(fromDate: string): Promise<{ count: number }> {
  const [year, month, day] = fromDate.split('-').map(Number)
  const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  const res = await fetch('/api/transactions/sync', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ startDate: startDate.toISOString(), endDate: new Date().toISOString() }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Nepodařilo se synchronizovat transakce')
  return { count: data.transactions?.length || 0 }
}
