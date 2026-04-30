import { unstable_cache } from 'next/cache'

// TTLs in seconds
export const CACHE_TTL = {
  overview:    60,   // 1 min — high-traffic landing section
  sales:       120,
  customers:   180,
  products:    180,
  financial:   120,
  operations:  120,
} as const

// Cache tag helpers — used for revalidation after data mutations
export const CACHE_TAGS = {
  analytics:   'analytics',
  sales:       'analytics-sales',
  customers:   'analytics-customers',
  products:    'analytics-products',
  financial:   'analytics-financial',
  operations:  'analytics-operations',
} as const

type CacheTag = typeof CACHE_TAGS[keyof typeof CACHE_TAGS]

export function withAnalyticsCache<T>(
  fn:      () => Promise<T>,
  key:     string[],
  tags:    CacheTag[],
  revalidate: number,
): Promise<T> {
  return unstable_cache(fn, key, { revalidate, tags })()
}
