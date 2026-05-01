// Shared types for the analytics ingestion + dispatch pipeline.

export const ANALYTICS_EVENT_TYPES = [
  'product_view',
  'add_to_cart',
  'begin_checkout',
  'purchase',
  'refund',
  'signup',
  'session_start',
] as const

export type AnalyticsEventType = typeof ANALYTICS_EVENT_TYPES[number]

// ── Properties per event type ─────────────────────────────────────────────────

export interface ProductViewProperties {
  productId:   string
  productName: string
  price?:      number
  currency?:   string
  categoryId?: string
}

export interface AddToCartProperties {
  productId:   string
  productName: string
  variantId?:  string
  variantName?: string
  price:       number
  currency:    string
  quantity:    number
}

export interface BeginCheckoutProperties {
  value:    number
  currency: string
  items:    CheckoutItem[]
}

export interface PurchaseProperties {
  orderId:      string   // e-shop Order.id
  erpOrderId?:  string   // ERP CustomerOrder.id — set after ERP sync
  revenue:      number
  shipping:     number
  tax:          number
  currency:     string
  items:        CheckoutItem[]
  // Customer PII — hashed by ERP before sending to Meta CAPI
  email?:       string
  phone?:       string
  firstName?:   string
  lastName?:    string
}

export interface RefundProperties {
  orderId:  string
  revenue:  number
  currency: string
  items?:   CheckoutItem[]
}

export interface SignupProperties {
  method: string  // "email" | "google" | etc.
}

export interface SessionStartProperties {
  utmSource?:   string
  utmMedium?:   string
  utmCampaign?: string
  utmContent?:  string
  utmTerm?:     string
  referrer?:    string
  landingPage?: string
}

export interface CheckoutItem {
  productId:   string
  productName: string
  variantId?:  string
  variantName?: string
  price:       number
  quantity:    number
}

export type AnalyticsEventProperties =
  | ProductViewProperties
  | AddToCartProperties
  | BeginCheckoutProperties
  | PurchaseProperties
  | RefundProperties
  | SignupProperties
  | SessionStartProperties

// ── Ingress payload (what the e-shop sends to ERP) ───────────────────────────

export interface IngressAnalyticsEvent {
  eventId:         string            // UUID — for deduplication
  eventType:       AnalyticsEventType
  entityType?:     string
  entityId?:       string
  userId?:         string            // e-shop User.id
  sessionId?:      string
  gaClientId?:     string            // GA4 _ga cookie value
  fbp?:            string            // Meta _fbp cookie
  fbc?:            string            // Meta _fbc click-ID cookie
  // UTM attribution — passed at top-level for indexing; also echoed in SessionStartProperties
  utmSource?:      string
  utmMedium?:      string
  utmCampaign?:    string
  utmContent?:     string
  utmTerm?:        string
  referrer?:       string
  landingPage?:    string
  source:          string            // always "eshop" from the e-shop emitter
  properties:      AnalyticsEventProperties
  ipAddress?:      string
  userAgent?:      string
  clientTimestamp: string            // ISO 8601 — when event occurred
}

// ── Internal normalised event (after storage + ERP enrichment) ───────────────

export interface InternalAnalyticsEvent extends IngressAnalyticsEvent {
  id:           string               // DB primary key
  erpCustomerId?: string
  erpOrderId?:  string
  createdAt:    Date
}

// ── Provider result ───────────────────────────────────────────────────────────

export interface ProviderResult {
  provider:     string
  success:      boolean
  httpStatus?:  number
  responseBody?: unknown
  errorMessage?: string
  skipped?:     boolean             // true when provider has no mapping for this event type
}
