// GA4 Measurement Protocol provider.
// Sends server-side events to Google Analytics 4.
// Docs: https://developers.google.com/analytics/devguides/collection/protocol/ga4

import type { ProviderAdapter } from '../types'
import type { InternalAnalyticsEvent, ProviderResult } from '../../types'
import { mapToGa4Payload } from './ga4Mapper'

const GA4_MP_ENDPOINT = 'https://www.google-analytics.com/mp/collect'
const GA4_MP_DEBUG    = 'https://www.google-analytics.com/debug/mp/collect'
const TIMEOUT_MS      = 8_000

export const ga4Provider: ProviderAdapter = {
  name: 'ga4',

  get enabled(): boolean {
    return Boolean(process.env.GA4_MEASUREMENT_ID && process.env.GA4_API_SECRET)
  },

  async send(event: InternalAnalyticsEvent): Promise<ProviderResult> {
    const measurementId = process.env.GA4_MEASUREMENT_ID
    const apiSecret     = process.env.GA4_API_SECRET

    if (!measurementId || !apiSecret) {
      return { provider: 'ga4', success: false, skipped: true, errorMessage: 'GA4 not configured' }
    }

    const payload = mapToGa4Payload(event)
    if (!payload) {
      return { provider: 'ga4', success: true, skipped: true }
    }

    const isDebug = process.env.NODE_ENV === 'development'
    const url     = `${isDebug ? GA4_MP_DEBUG : GA4_MP_ENDPOINT}?measurement_id=${measurementId}&api_secret=${apiSecret}`

    try {
      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
        signal:  AbortSignal.timeout(TIMEOUT_MS),
      })

      const responseBody = await res.json().catch(() => null)

      if (!res.ok) {
        return {
          provider:     'ga4',
          success:      false,
          httpStatus:   res.status,
          responseBody,
          errorMessage: `GA4 returned ${res.status}`,
        }
      }

      return { provider: 'ga4', success: true, httpStatus: res.status, responseBody }
    } catch (err: unknown) {
      return {
        provider:     'ga4',
        success:      false,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  },
}
