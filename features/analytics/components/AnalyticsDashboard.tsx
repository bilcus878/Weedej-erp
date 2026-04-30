'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, usePathname }        from 'next/navigation'
import { buildPreset }                   from '@/lib/analytics/dateRange'
import { AnalyticsFilterBar }            from './AnalyticsFilterBar'
import { OverviewSection }               from './sections/OverviewSection'
import { SalesSection }                  from './sections/SalesSection'
import { CustomersSection }              from './sections/CustomersSection'
import { ProductsSection }               from './sections/ProductsSection'
import { FinancialSection }              from './sections/FinancialSection'
import { OperationsSection }             from './sections/OperationsSection'
import { MarketingSection }              from './sections/MarketingSection'
import { useAnalytics }                  from '../hooks/useAnalytics'
import type { AnalyticsFilters }         from '../types'
import type { DatePreset }               from '@/lib/analytics/dateRange'

type TabId = 'overview' | 'sales' | 'customers' | 'products' | 'financial' | 'operations' | 'marketing'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',   label: 'Přehled'   },
  { id: 'sales',      label: 'Prodeje'   },
  { id: 'customers',  label: 'Zákazníci' },
  { id: 'products',   label: 'Produkty'  },
  { id: 'financial',  label: 'Finance'   },
  { id: 'operations', label: 'Operace'   },
  { id: 'marketing',  label: 'Marketing' },
]

interface Props {
  initialParams?: Record<string, string>
}

function parseInitialFilters(params: Record<string, string> = {}): AnalyticsFilters {
  const preset   = (params['preset'] as DatePreset) || 'last30'
  const from     = params['from']
  const to       = params['to']
  // URL uses compare=1 for previous_period
  const compare: AnalyticsFilters['compare'] =
    params['compare'] === '1' ? 'previous_period' : 'none'

  if (from && to) {
    return { preset: preset ?? 'custom', from, to, compare }
  }
  const range = buildPreset(preset)
  return {
    preset,
    from:    range.from.toISOString().slice(0, 10),
    to:      range.to.toISOString().slice(0, 10),
    compare,
  }
}

export function AnalyticsDashboard({ initialParams }: Props) {
  const router   = useRouter()
  const pathname = usePathname()

  const initialFilters = useMemo(() => parseInitialFilters(initialParams), []) // eslint-disable-line

  const VALID_TABS: TabId[] = ['overview', 'sales', 'customers', 'products', 'financial', 'operations', 'marketing']
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const t = initialParams?.['tab'] as TabId
    return VALID_TABS.includes(t) ? t : 'overview'
  })
  const {
    filters, applyFilters, refresh,
    loading, error,
    overview, sales, customers, products, financial, operations, marketing,
    fetchSection,
  } = useAnalytics(initialFilters)

  // Fetch overview immediately on mount
  useEffect(() => { fetchSection('overview') }, []) // eslint-disable-line

  // Fetch section data lazily on tab change
  useEffect(() => {
    if (activeTab !== 'overview') fetchSection(activeTab)
  }, [activeTab]) // eslint-disable-line

  // Sync filters + active tab → URL (replace to avoid polluting history)
  useEffect(() => {
    const p = new URLSearchParams()
    p.set('preset', filters.preset)
    p.set('from',   filters.from)
    p.set('to',     filters.to)
    if (filters.compare !== 'none') p.set('compare', '1')
    if (activeTab !== 'overview') p.set('tab', activeTab)
    router.replace(`${pathname}?${p.toString()}`, { scroll: false })
  }, [filters.preset, filters.from, filters.to, filters.compare, activeTab]) // eslint-disable-line

  const anyLoading = Object.values(loading).some(Boolean)

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Analytika</h1>
        <AnalyticsFilterBar
          filters={filters}
          onChange={applyFilters}
          onRefresh={refresh}
          loading={anyLoading}
        />
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Error banner */}
      {error[activeTab] && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          Chyba při načítání: {error[activeTab]}
        </div>
      )}

      {/* Content */}
      <div>
        {activeTab === 'overview'   && <OverviewSection   report={overview}   filters={filters} loading={!!loading.overview}   />}
        {activeTab === 'sales'      && <SalesSection      report={sales}      filters={filters} loading={!!loading.sales}      />}
        {activeTab === 'customers'  && <CustomersSection  report={customers}  filters={filters} loading={!!loading.customers}  />}
        {activeTab === 'products'   && <ProductsSection   report={products}   filters={filters} loading={!!loading.products}   />}
        {activeTab === 'financial'  && <FinancialSection  report={financial}  filters={filters} loading={!!loading.financial}  />}
        {activeTab === 'operations' && <OperationsSection report={operations} filters={filters} loading={!!loading.operations} />}
        {activeTab === 'marketing'  && <MarketingSection  report={marketing}  filters={filters} loading={!!loading.marketing}  />}
      </div>
    </div>
  )
}
