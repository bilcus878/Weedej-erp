'use client'

import { useState, useEffect } from 'react'

export interface AuditEntry {
  id:          string
  userId:      string | null
  username:    string | null
  actionType:  string
  fieldName:   string | null
  oldValue:    string | null
  newValue:    string | null
  createdAt:   string
}

export function useCustomerOrderAudit(orderId: string) {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/customer-orders/${orderId}/audit`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orderId])

  return { entries, loading }
}