// Meta Conversions API provider (server-side).
// Sends events to the Meta Graph API for conversion tracking.
// Docs: https://developers.facebook.com/docs/marketing-api/conversions-api

import type { ProviderAdapter } from '../types'
import type { InternalAnalyticsEvent, ProviderResult } from '../../types'
import { mapToMetaPayload } from './metaMapper'

const META_GRAPH_VERSION = 'v21.0'
const TIMEOUT_MS         = 8_000

function metaEndpoint(): string {
  const pixelId = process.env.META_PIXEL_ID!
  return `https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/events`
}

export const metaProvider: ProviderAdapter = {
  name: 'meta',

  get enabled(): boolean {
    return Boolean(process.env.META_PIXEL_ID && process.env.META_ACCESS_TOKEN)
  },

  async send(event: InternalAnalyticsEvent): Promise<ProviderResult> {
    const pixelId     = process.env.META_PIXEL_ID
    const accessToken = process.env.META_ACCESS_TOKEN

    if (!pixelId || !accessToken) {
      return { provider: 'meta', success: false, skipped: true, errorMessage: 'Meta CAPI not configured' }
    }

    const payload = mapToMetaPayload(event)
    if (!payload) {
      return { provider: 'meta', success: true, skipped: true }
    }

    const url = `${metaEndpoint()}?access_token=${accessToken}`

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
          provider:     'meta',
          success:      false,
          httpStatus:   res.status,
          responseBody,
          errorMessage: `Meta CAPI returned ${res.status}`,
        }
      }

      return { provider: 'meta', success: true, httpStatus: res.status, responseBody }
    } catch (err: unknown) {
      return {
        provider:     'meta',
        success:      false,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  },
}
