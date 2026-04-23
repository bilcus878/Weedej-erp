'use client'

import { useState, useEffect } from 'react'

interface CompanySettings {
  isVatPayer: boolean
}

// Module-level cache — settings are company-wide and never change during a session
let cache: CompanySettings | null = null

export function useCompanySettings(): CompanySettings {
  const [settings, setSettings] = useState<CompanySettings>(cache ?? { isVatPayer: true })

  useEffect(() => {
    if (cache) { setSettings(cache); return }
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        cache = { isVatPayer: d.isVatPayer ?? true }
        setSettings(cache)
      })
      .catch(() => {})
  }, [])

  return settings
}
