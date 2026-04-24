'use client'

import { Building2, FileText, Settings as SettingsIcon, Key } from 'lucide-react'
import {
  useSettings, ToastContainer,
  CompanyTab, InvoicingTab, SystemTab, ApiTab,
} from '@/features/settings'
import type { SettingsTab } from '@/features/settings'

export const dynamic = 'force-dynamic'

const TABS: { id: SettingsTab; label: string; icon: typeof Building2; description: string }[] = [
  { id: 'company',   label: 'Firma',     icon: Building2,     description: 'Údaje společnosti' },
  { id: 'invoicing', label: 'Fakturace', icon: FileText,      description: 'DPH a číslovací řady' },
  { id: 'system',    label: 'Systém',    icon: SettingsIcon,  description: 'Sklad a databáze' },
  { id: 'api',       label: 'API klíče', icon: Key,           description: 'Přístup e-shopu' },
]

export default function SettingsPage() {
  const s = useSettings()

  if (s.loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Načítání nastavení...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={s.toasts} onDismiss={s.dismissToast} />

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-l-4 border-slate-500 rounded-lg shadow-sm py-4 px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-700 flex items-center gap-2">
              <SettingsIcon className="h-6 w-6" />Nastavení
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Údaje společnosti, fakturace a systémová nastavení</p>
          </div>
          {s.hasChanges && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-medium">Neuložené změny</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(tab => {
          const Icon     = tab.icon
          const isActive = s.activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => s.setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-white shadow-md border border-gray-200 text-slate-800'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/60 border border-transparent'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : ''}`} />
              <div className="text-left">
                <div>{tab.label}</div>
                <div className={`text-xs font-normal ${isActive ? 'text-gray-500' : 'text-gray-400'}`}>{tab.description}</div>
              </div>
            </button>
          )
        })}
      </div>

      {s.activeTab === 'company' && (
        <CompanyTab
          formData={s.formData}
          settings={s.settings}
          hasChanges={s.hasChanges}
          saving={s.saving}
          originalFD={s.originalFD}
          setFormData={s.setFormData}
          onSubmit={s.handleSubmit}
        />
      )}

      {s.activeTab === 'invoicing' && (
        <InvoicingTab settings={s.settings} onToggleVatPayer={s.handleToggleVatPayer} />
      )}

      {s.activeTab === 'system' && (
        <SystemTab
          settings={s.settings}
          showResetConfirm={s.showResetConfirm}
          resetting={s.resetting}
          setShowResetConfirm={s.setShowResetConfirm}
          onToggleNegativeStock={s.handleToggleNegativeStock}
          onResetDatabase={s.handleResetDatabase}
        />
      )}

      {s.activeTab === 'api' && (
        <ApiTab
          apiKeys={s.apiKeys}
          apiKeysLoading={s.apiKeysLoading}
          newKeyName={s.newKeyName}
          creatingKey={s.creatingKey}
          justCreatedKey={s.justCreatedKey}
          copiedKey={s.copiedKey}
          setNewKeyName={s.setNewKeyName}
          setJustCreatedKey={s.setJustCreatedKey}
          onCreateKey={s.handleCreateApiKey}
          onToggleKey={s.handleToggleApiKey}
          onDeleteKey={s.handleDeleteApiKey}
          onCopy={s.copyToClipboard}
        />
      )}
    </div>
  )
}
