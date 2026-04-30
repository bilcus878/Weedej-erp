import type { Metadata } from 'next'
import { AnalyticsDashboard } from '@/features/analytics/components/AnalyticsDashboard'

export const metadata: Metadata = { title: 'Analytika — Weedej ERP' }

interface Props {
  searchParams?: Record<string, string | string[] | undefined>
}

export default function AnalyticsPage({ searchParams }: Props) {
  // Normalise to plain string values for the client component
  const params: Record<string, string> = {}
  for (const [k, v] of Object.entries(searchParams ?? {})) {
    if (typeof v === 'string') params[k] = v
    else if (Array.isArray(v) && v[0]) params[k] = v[0]
  }

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      <AnalyticsDashboard initialParams={params} />
    </div>
  )
}
