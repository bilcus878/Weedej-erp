'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchTimeline } from '../services/crmService'
import type { TimelineEvent } from '../types'

export function useCrmTimeline(customerId: string, limit = 50) {
  const [events,   setEvents]   = useState<TimelineEvent[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setEvents(await fetchTimeline(customerId, limit))
    } catch {
      setError('Nepodařilo se načíst timeline')
    } finally {
      setLoading(false)
    }
  }, [customerId, limit])

  useEffect(() => { refresh() }, [refresh])

  return { events, loading, error, refresh }
}
