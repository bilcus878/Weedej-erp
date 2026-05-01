import { prisma }      from '@/lib/platform/db/prisma'
import { compare }     from '@/lib/features/analytics/comparisonEngine'
import { formatPrice } from '@/lib/shared/finance/money'
import type { DateRange } from '@/lib/features/analytics/dateRange'
import type {
  MarketingReport,
  FunnelStep,
  TrafficSource,
  CampaignRow,
  AttributionRow,
} from '../types'

interface MarketingServiceParams {
  range:      DateRange
  prevRange?: DateRange
}

const FUNNEL_STEPS: { label: string; eventType: string }[] = [
  { label: 'Zahájení session',      eventType: 'session_start'  },
  { label: 'Zobrazení produktu',    eventType: 'product_view'   },
  { label: 'Přidání do košíku',     eventType: 'add_to_cart'    },
  { label: 'Zahájení objednávky',   eventType: 'begin_checkout' },
  { label: 'Dokončení nákupu',      eventType: 'purchase'       },
]

export async function getMarketingReport({ range, prevRange }: MarketingServiceParams): Promise<MarketingReport> {
  const from = range.from
  const to   = range.to

  // ── Funnel: distinct sessions per step ─────────────────────────────────────
  const funnelRaw = await Promise.all(
    FUNNEL_STEPS.map(step =>
      prisma.analyticsEvent.groupBy({
        by:     ['eventType'],
        where:  { eventType: step.eventType, clientTimestamp: { gte: from, lte: to } },
        _count: { sessionId: true },
      }).then(rows => ({
        label:    step.label,
        sessions: rows[0]?._count.sessionId ?? 0,
      }))
    )
  )

  // Step-over-step conversion: what % of the previous step proceeded to this one
  const funnel: FunnelStep[] = funnelRaw.map((step, idx) => ({
    step:       step.label,
    sessions:   step.sessions,
    stepConvPct: idx === 0
      ? 100
      : funnelRaw[idx - 1].sessions === 0
        ? 0
        : Math.round((step.sessions / funnelRaw[idx - 1].sessions) * 100),
  }))

  // ── Traffic sources ─────────────────────────────────────────────────────────
  const [sessionRows, purchaseRows] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where:  { eventType: 'session_start', clientTimestamp: { gte: from, lte: to } },
      select: { sessionId: true, utmSource: true, utmMedium: true },
    }),
    prisma.analyticsEvent.findMany({
      where:  { eventType: 'purchase', clientTimestamp: { gte: from, lte: to } },
      select: { sessionId: true, utmSource: true, properties: true },
    }),
  ])

  const sessionsBySource = new Map<string, Set<string>>()
  for (const row of sessionRows) {
    const src = normalizeSource(row.utmSource, row.utmMedium)
    if (!sessionsBySource.has(src)) sessionsBySource.set(src, new Set())
    if (row.sessionId) sessionsBySource.get(src)!.add(row.sessionId)
  }

  const purchasesBySource = new Map<string, { sessions: Set<string>; revenue: number }>()
  for (const row of purchaseRows) {
    const src = normalizeSource(row.utmSource, null)
    if (!purchasesBySource.has(src)) purchasesBySource.set(src, { sessions: new Set(), revenue: 0 })
    if (row.sessionId) purchasesBySource.get(src)!.sessions.add(row.sessionId)
    const props = row.properties as Record<string, unknown> | null
    purchasesBySource.get(src)!.revenue += Number(props?.revenue ?? 0)
  }

  const allSources = new Set([...sessionsBySource.keys(), ...purchasesBySource.keys()])
  const trafficSources: TrafficSource[] = Array.from(allSources).map(source => {
    const sessions  = sessionsBySource.get(source)?.size ?? 0
    const purchases = purchasesBySource.get(source)?.sessions.size ?? 0
    const revenue   = purchasesBySource.get(source)?.revenue ?? 0
    return {
      source,
      sessions,
      purchases,
      revenue,
      convRate: sessions > 0 ? Math.round((purchases / sessions) * 10000) / 100 : 0,
    }
  }).sort((a, b) => b.sessions - a.sessions)

  // ── Campaign analytics ──────────────────────────────────────────────────────
  const [campaignSessions, campaignPurchases] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where:  { eventType: 'session_start', clientTimestamp: { gte: from, lte: to }, utmCampaign: { not: null } },
      select: { sessionId: true, utmCampaign: true, utmMedium: true },
    }),
    prisma.analyticsEvent.findMany({
      where:  { eventType: 'purchase', clientTimestamp: { gte: from, lte: to }, utmCampaign: { not: null } },
      select: { sessionId: true, utmCampaign: true, utmMedium: true, properties: true },
    }),
  ])

  const campaignMap = new Map<string, { medium: string; sessions: Set<string>; purchaseSessions: Set<string>; revenue: number }>()
  for (const row of campaignSessions) {
    const key = row.utmCampaign!
    if (!campaignMap.has(key)) campaignMap.set(key, { medium: row.utmMedium ?? '', sessions: new Set(), purchaseSessions: new Set(), revenue: 0 })
    if (row.sessionId) campaignMap.get(key)!.sessions.add(row.sessionId)
  }
  for (const row of campaignPurchases) {
    const key = row.utmCampaign!
    if (!campaignMap.has(key)) campaignMap.set(key, { medium: row.utmMedium ?? '', sessions: new Set(), purchaseSessions: new Set(), revenue: 0 })
    if (row.sessionId) campaignMap.get(key)!.purchaseSessions.add(row.sessionId)
    const props = row.properties as Record<string, unknown> | null
    campaignMap.get(key)!.revenue += Number(props?.revenue ?? 0)
  }

  const campaigns: CampaignRow[] = Array.from(campaignMap.entries()).map(([campaign, data]) => ({
    campaign,
    medium:    data.medium,
    sessions:  data.sessions.size,
    purchases: data.purchaseSessions.size,
    revenue:   data.revenue,
    convRate:  data.sessions.size > 0
      ? Math.round((data.purchaseSessions.size / data.sessions.size) * 10000) / 100
      : 0,
  })).sort((a, b) => b.revenue - a.revenue)

  // ── Attribution ─────────────────────────────────────────────────────────────
  const purchaseSessionIds = purchaseRows.map(r => r.sessionId).filter((id): id is string => Boolean(id))
  const sessions = purchaseSessionIds.length > 0
    ? await prisma.analyticsSession.findMany({
        where:  { sessionId: { in: purchaseSessionIds } },
        select: { sessionId: true, utmSource: true },
      })
    : []

  const sessionUtmMap = new Map(sessions.map(s => [s.sessionId, s.utmSource]))
  const attrMap = new Map<string, { firstTouchRev: number; lastTouchRev: number; firstTouchOrds: number; lastTouchOrds: number }>()
  for (const row of purchaseRows) {
    const props    = row.properties as Record<string, unknown> | null
    const revenue  = Number(props?.revenue ?? 0)
    const firstSrc = (row.sessionId ? sessionUtmMap.get(row.sessionId) : null) ?? 'direct'
    const lastSrc  = normalizeSource(row.utmSource, null)

    if (!attrMap.has(firstSrc)) attrMap.set(firstSrc, { firstTouchRev: 0, lastTouchRev: 0, firstTouchOrds: 0, lastTouchOrds: 0 })
    attrMap.get(firstSrc)!.firstTouchRev  += revenue
    attrMap.get(firstSrc)!.firstTouchOrds += 1

    if (!attrMap.has(lastSrc)) attrMap.set(lastSrc, { firstTouchRev: 0, lastTouchRev: 0, firstTouchOrds: 0, lastTouchOrds: 0 })
    attrMap.get(lastSrc)!.lastTouchRev  += revenue
    attrMap.get(lastSrc)!.lastTouchOrds += 1
  }

  const attribution: AttributionRow[] = Array.from(attrMap.entries())
    .map(([source, data]) => ({ source, ...data }))
    .sort((a, b) => b.firstTouchRev - a.firstTouchRev)

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalSessionCount = funnelRaw[0]?.sessions ?? 0
  const purchaseCount     = funnelRaw[funnelRaw.length - 1]?.sessions ?? 0
  const convRate          = totalSessionCount > 0 ? purchaseCount / totalSessionCount : 0

  // Revenue + AOV from current purchase events
  const totalRevValue = purchaseRows.reduce((s, row) => {
    const props = row.properties as Record<string, unknown> | null
    return s + Number(props?.revenue ?? 0)
  }, 0)
  const aovValue = purchaseCount > 0 ? totalRevValue / purchaseCount : 0

  // Page views count
  const pageViews = await prisma.analyticsEvent.count({
    where: { eventType: 'product_view', clientTimestamp: { gte: from, lte: to } },
  })

  // ── Previous period comparisons ─────────────────────────────────────────────
  let prevSessions    = 0
  let prevPurchases   = 0
  let prevRevValue    = 0
  let prevPageViews   = 0

  if (prevRange) {
    const [ps, pp, ppRows, ppViews] = await Promise.all([
      prisma.analyticsEvent.groupBy({
        by: ['eventType'],
        where: { eventType: 'session_start', clientTimestamp: { gte: prevRange.from, lte: prevRange.to } },
        _count: { sessionId: true },
      }),
      prisma.analyticsEvent.groupBy({
        by: ['eventType'],
        where: { eventType: 'purchase', clientTimestamp: { gte: prevRange.from, lte: prevRange.to } },
        _count: { sessionId: true },
      }),
      prisma.analyticsEvent.findMany({
        where:  { eventType: 'purchase', clientTimestamp: { gte: prevRange.from, lte: prevRange.to } },
        select: { properties: true },
      }),
      prisma.analyticsEvent.count({
        where: { eventType: 'product_view', clientTimestamp: { gte: prevRange.from, lte: prevRange.to } },
      }),
    ])
    prevSessions  = ps[0]?._count.sessionId ?? 0
    prevPurchases = pp[0]?._count.sessionId ?? 0
    prevRevValue  = ppRows.reduce((s, row) => {
      const props = row.properties as Record<string, unknown> | null
      return s + Number(props?.revenue ?? 0)
    }, 0)
    prevPageViews = ppViews
  }

  const prevConvRate = prevSessions > 0 ? prevPurchases / prevSessions : 0
  const prevAov      = prevPurchases > 0 ? prevRevValue / prevPurchases : 0

  return {
    totalSessions: {
      label:      'Sessions',
      value:      totalSessionCount,
      formatted:  totalSessionCount.toLocaleString('cs-CZ'),
      comparison: prevRange ? compare(totalSessionCount, prevSessions) : undefined,
    },
    totalPageViews: {
      label:      'Zobrazení produktů',
      value:      pageViews,
      formatted:  pageViews.toLocaleString('cs-CZ'),
      comparison: prevRange ? compare(pageViews, prevPageViews) : undefined,
    },
    purchaseSessions: {
      label:      'Nákupy',
      value:      purchaseCount,
      formatted:  purchaseCount.toLocaleString('cs-CZ'),
      comparison: prevRange ? compare(purchaseCount, prevPurchases) : undefined,
    },
    overallConvRate: {
      label:      'Konverzní poměr',
      value:      convRate,
      formatted:  `${(convRate * 100).toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} %`,
      comparison: prevRange ? compare(convRate, prevConvRate) : undefined,
    },
    avgOrderValue: {
      label:      'Průměrná objednávka',
      value:      aovValue,
      formatted:  formatPrice(aovValue),
      comparison: prevRange ? compare(aovValue, prevAov) : undefined,
    },
    totalRevenue: {
      label:      'Tržby (e-shop)',
      value:      totalRevValue,
      formatted:  formatPrice(totalRevValue),
      comparison: prevRange ? compare(totalRevValue, prevRevValue) : undefined,
    },
    funnel,
    trafficSources,
    campaigns,
    attribution,
  }
}

function normalizeSource(utmSource: string | null | undefined, utmMedium: string | null | undefined): string {
  if (!utmSource) return 'direct'
  if (utmSource === 'google' && (utmMedium === 'organic' || !utmMedium)) return 'google / organic'
  return utmSource
}
