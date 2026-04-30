// Maps internal analytics events → GA4 Measurement Protocol payload.
// Docs: https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference

import type { InternalAnalyticsEvent, AnalyticsEventType, CheckoutItem } from '../../types'

const GA4_EVENT_NAME: Record<AnalyticsEventType, string> = {
  product_view:    'view_item',
  add_to_cart:     'add_to_cart',
  begin_checkout:  'begin_checkout',
  purchase:        'purchase',
  refund:          'refund',
  signup:          'sign_up',
}

export interface Ga4Payload {
  client_id:        string
  user_id?:         string
  timestamp_micros: number
  non_personalized_ads: boolean
  events: Ga4Event[]
}

interface Ga4Event {
  name:   string
  params: Record<string, unknown>
}

function extractClientId(gaCookie: string | undefined | null): string {
  if (!gaCookie) return 'anonymous.0'
  // _ga cookie format: GA1.1.XXXXXXXXXX.XXXXXXXXXX — client_id is the last two parts
  const parts = gaCookie.split('.')
  if (parts.length >= 4) return `${parts[2]}.${parts[3]}`
  return gaCookie
}

function mapItems(items: CheckoutItem[]): Record<string, unknown>[] {
  return items.map(item => ({
    item_id:   item.variantId ?? item.productId,
    item_name: item.productName,
    price:     item.price,
    quantity:  item.quantity,
    ...(item.variantName ? { item_variant: item.variantName } : {}),
  }))
}

export function mapToGa4Payload(event: InternalAnalyticsEvent): Ga4Payload | null {
  const eventName = GA4_EVENT_NAME[event.eventType]
  if (!eventName) return null

  const clientId = extractClientId(event.gaClientId)
  const timestampMicros = new Date(event.clientTimestamp).getTime() * 1000

  const params = buildEventParams(event)

  return {
    client_id:        clientId,
    ...(event.userId ? { user_id: event.userId } : {}),
    timestamp_micros: timestampMicros,
    non_personalized_ads: false,
    events: [{ name: eventName, params }],
  }
}

function buildEventParams(event: InternalAnalyticsEvent): Record<string, unknown> {
  const p = event.properties as Record<string, unknown>

  switch (event.eventType) {
    case 'product_view':
      return {
        currency:    p['currency'] ?? 'CZK',
        value:       p['price'] ?? 0,
        items: [{
          item_id:   p['productId'],
          item_name: p['productName'],
          price:     p['price'] ?? 0,
          quantity:  1,
        }],
      }

    case 'add_to_cart':
      return {
        currency: p['currency'] ?? 'CZK',
        value:    Number(p['price'] ?? 0) * Number(p['quantity'] ?? 1),
        items: [{
          item_id:   p['variantId'] ?? p['productId'],
          item_name: p['productName'],
          price:     p['price'] ?? 0,
          quantity:  p['quantity'] ?? 1,
          ...(p['variantName'] ? { item_variant: p['variantName'] } : {}),
        }],
      }

    case 'begin_checkout':
      return {
        currency: p['currency'] ?? 'CZK',
        value:    p['value'] ?? 0,
        items:    mapItems((p['items'] as CheckoutItem[]) ?? []),
      }

    case 'purchase':
      return {
        transaction_id: p['orderId'],
        affiliation:    'Weedej E-shop',
        value:          p['revenue'] ?? 0,
        shipping:       p['shipping'] ?? 0,
        tax:            p['tax'] ?? 0,
        currency:       p['currency'] ?? 'CZK',
        items:          mapItems((p['items'] as CheckoutItem[]) ?? []),
      }

    case 'refund':
      return {
        transaction_id: p['orderId'],
        value:          p['revenue'] ?? 0,
        currency:       p['currency'] ?? 'CZK',
        items:          mapItems((p['items'] as CheckoutItem[]) ?? []),
      }

    case 'signup':
      return { method: p['method'] ?? 'email' }

    default:
      return {}
  }
}
