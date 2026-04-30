import type { Metadata } from 'next'
import { AnalyticsDashboard } from '@/features/analytics/components/AnalyticsDashboard'

export const metadata: Metadata = { title: 'Analytika — Weedej ERP' }

export default function AnalyticsPage() {
  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      <AnalyticsDashboard />
    </div>
  )
}
