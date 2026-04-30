// Maps internal analytics events → Meta Conversions API payload.
// Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
//
// GDPR / Meta requirements:
//   All PII (email, phone, name) MUST be SHA-256 hashed before transmission.
//   Normalisation: lowercase, trim whitespace before hashing.

import { createHash } from 'crypto'
import type { InternalAnalyticsEvent, AnalyticsEventType, CheckoutItem } from '../../types'

// Meta has no standard events for login / refund (we skip them)
const META_EVENT_NAME: Record<AnalyticsEventType, string | null> = {
  product_view:   'ViewContent',
  add_to_cart:    'AddToCart',
  begin_checkout: 'InitiateCheckout',
  purchase:       'Purchase',
  refund:         null,   // no standard Meta event
  signup:         'CompleteRegistration',
  session_start:  null,   // not sent to Meta
}

export interface MetaCapiPayload {
  data: MetaEvent[]
  test_event_code?: string
}

interface MetaEvent {
  event_name:    string
  event_time:    number
  event_id:      string
  action_source: 'website'
  user_data:     MetaUserData
  custom_data?:  Record<string, unknown>
}

interface MetaUserData {
  em?:                  string[]   // hashed email
  ph?:                  string[]   // hashed phone
  fn?:                  string[]   // hashed first name
  ln?:                  string[]   // hashed last name
  client_ip_address?:   string
  client_user_agent?:   string
  fbp?:                 string
  fbc?:                 string
}

function sha256(value: string): string {
  return createHash('sha256').update(value.toLowerCase().trim()).digest('hex')
}

function hashIfPresent(value?: string | null): string[] | undefined {
  if (!value?.trim()) return undefined
  return [sha256(value)]
}

function normalisePhone(phone?: string | null): string | null {
  if (!phone) return null
  // Strip everything except digits and leading +
  return phone.replace(/[^+\d]/g, '')
}

function mapContents(items: CheckoutItem[]): Record<string, unknown>[] {
  return items.map(item => ({
    id:         item.variantId ?? item.productId,
    quantity:   item.quantity,
    item_price: item.price,
  }))
}

export function mapToMetaPayload(event: InternalAnalyticsEvent): MetaCapiPayload | null {
  const metaEventName = META_EVENT_NAME[event.eventType]
  if (!metaEventName) return null

  const p = event.properties as unknown as Record<string, unknown>

  const userData: MetaUserData = {
    em:                 hashIfPresent(p['email'] as string),
    ph:                 hashIfPresent(normalisePhone(p['phone'] as string)),
    fn:                 hashIfPresent((p['firstName'] as string)),
    ln:                 hashIfPresent((p['lastName'] as string)),
    client_ip_address:  event.ipAddress ?? undefined,
    client_user_agent:  event.userAgent ?? undefined,
    fbp:                event.fbp ?? undefined,
    fbc:                event.fbc ?? undefined,
  }

  const customData = buildCustomData(event)

  const metaEvent: MetaEvent = {
    event_name:    metaEventName,
    event_time:    Math.floor(new Date(event.clientTimestamp).getTime() / 1000),
    event_id:      event.eventId,   // deduplication with browser Meta Pixel
    action_source: 'website',
    user_data:     userData,
    ...(customData ? { custom_data: customData } : {}),
  }

  const payload: MetaCapiPayload = { data: [metaEvent] }

  if (process.env.META_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_TEST_EVENT_CODE
  }

  return payload
}

function buildCustomData(event: InternalAnalyticsEvent): Record<string, unknown> | null {
  const p = event.properties as unknown as Record<string, unknown>

  switch (event.eventType) {
    case 'product_view':
      return {
        content_ids:  [p['productId']],
        content_name: p['productName'],
        content_type: 'product',
        value:        p['price'] ?? 0,
        currency:     p['currency'] ?? 'CZK',
      }

    case 'add_to_cart': {
      const qty = Number(p['quantity'] ?? 1)
      return {
        content_ids:  [p['variantId'] ?? p['productId']],
        content_name: p['productName'],
        content_type: 'product',
        value:        Number(p['price'] ?? 0) * qty,
        currency:     p['currency'] ?? 'CZK',
        num_items:    qty,
      }
    }

    case 'begin_checkout': {
      const items = (p['items'] as CheckoutItem[]) ?? []
      return {
        content_ids:  items.map(i => i.variantId ?? i.productId),
        content_type: 'product',
        value:        p['value'] ?? 0,
        currency:     p['currency'] ?? 'CZK',
        num_items:    items.reduce((s, i) => s + i.quantity, 0),
      }
    }

    case 'purchase': {
      const items = (p['items'] as CheckoutItem[]) ?? []
      return {
        content_ids:  items.map(i => i.variantId ?? i.productId),
        contents:     mapContents(items),
        content_type: 'product',
        value:        p['revenue'] ?? 0,
        currency:     p['currency'] ?? 'CZK',
        num_items:    items.reduce((s, i) => s + i.quantity, 0),
      }
    }

    case 'signup':
      return { content_name: 'registration' }

    default:
      return null
  }
}
