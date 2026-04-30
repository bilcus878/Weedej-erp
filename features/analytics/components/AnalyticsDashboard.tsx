'use client'

import { useEffect, useState } from 'react'
import { AnalyticsFilterBar }  from './AnalyticsFilterBar'
import { OverviewSection }     from './sections/OverviewSection'
import { SalesSection }        from './sections/SalesSection'
import { CustomersSection }    from './sections/CustomersSection'
import { ProductsSection }     from './sections/ProductsSection'
import { FinancialSection }    from './sections/FinancialSection'
import { OperationsSection }   from './sections/OperationsSection'
import { useAnalytics }        from '../hooks/useAnalytics'

type TabId = 'overview' | 'sales' | 'customers' | 'products' | 'financial' | 'operations'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',   label: 'Přehled'   },
  { id: 'sales',      label: 'Prodeje'   },
  { id: 'customers',  label: 'Zákazníci' },
  { id: 'products',   label: 'Produkty'  },
  { id: 'financial',  label: 'Finance'   },
  { id: 'operations', label: 'Operace'   },
]

export function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const {
    filters, applyFilters, refresh,
    loading, error,
    overview, sales, customers, products, financial, operations,
    fetchSection,
  } = useAnalytics()

  // Fetch overview immediately on mount
  useEffect(() => { fetchSection('overview') }, []) // eslint-disable-line

  // Fetch section data lazily on tab change
  useEffect(() => {
    if (activeTab !== 'overview') fetchSection(activeTab)
  }, [activeTab]) // eslint-disable-line

  const anyLoading = Object.values(loading).some(Boolean)

  function handleTabChange(tab: TabId) {
    setActiveTab(tab)
  }

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
              onClick={() => handleTabChange(tab.id)}
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
        {activeTab === 'overview'   && <OverviewSection   report={overview}   loading={!!loading.overview}   />}
        {activeTab === 'sales'      && <SalesSection      report={sales}      filters={filters} loading={!!loading.sales}      />}
        {activeTab === 'customers'  && <CustomersSection  report={customers}  filters={filters} loading={!!loading.customers}  />}
        {activeTab === 'products'   && <ProductsSection   report={products}   filters={filters} loading={!!loading.products}   />}
        {activeTab === 'financial'  && <FinancialSection  report={financial}  filters={filters} loading={!!loading.financial}  />}
        {activeTab === 'operations' && <OperationsSection report={operations} filters={filters} loading={!!loading.operations} />}
      </div>
    </div>
  )
}
