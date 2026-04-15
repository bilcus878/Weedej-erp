// Stránka pro nastavení (/settings)
// Moderní design s taby, ikonami, toast notifikacemi
// Údaje pro faktury (název firmy, IČ, DIČ, adresa, atd.)

'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import {
  Save,
  Trash2,
  AlertTriangle,
  Building2,
  FileText,
  Shield,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Image,
  Hash,
  Receipt,
  Package,
  CheckCircle,
  XCircle,
  X,
  Settings,
  ToggleLeft,
  ToggleRight,
  Info,
  Landmark,
  ChevronRight,
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Globe,
} from 'lucide-react'

interface Settings {
  id: string
  companyName: string
  ico: string
  dic: string
  address: string
  phone: string
  email: string
  bankAccount: string
  logo?: string
  lastIssuedInvoiceNumber: number
  lastIssuedInvoiceYear: number
  allowNegativeStock: boolean
  isVatPayer: boolean
}

type Tab = 'company' | 'invoicing' | 'system' | 'api'

interface ApiKeyItem {
  id: string
  name: string
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
  keyPreview: string
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'warning'
}

let toastId = 0

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('company')

  // API klíče stav
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([])
  const [apiKeysLoading, setApiKeysLoading] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const [justCreatedKey, setJustCreatedKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  const [formData, setFormData] = useState({
    companyName: '',
    ico: '',
    dic: '',
    address: '',
    phone: '',
    email: '',
    bankAccount: '',
    logo: '',
  })

  const [originalFormData, setOriginalFormData] = useState({
    companyName: '',
    ico: '',
    dic: '',
    address: '',
    phone: '',
    email: '',
    bankAccount: '',
    logo: '',
  })

  function showToast(message: string, type: 'success' | 'error' | 'warning') {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  function dismissToast(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  useEffect(() => {
    fetchSettings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeTab === 'api') fetchApiKeys()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(originalFormData)
    setHasChanges(changed)
  }, [formData, originalFormData])

  async function fetchSettings() {
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()
      setSettings(data)
      const fd = {
        companyName: data.companyName || '',
        ico: data.ico || '',
        dic: data.dic || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        bankAccount: data.bankAccount || '',
        logo: data.logo || '',
      }
      setFormData(fd)
      setOriginalFormData(fd)
    } catch (error) {
      console.error('Chyba při načítání nastavení:', error)
      showToast('Nepodařilo se načíst nastavení', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        showToast('Nastavení úspěšně uloženo', 'success')
        await fetchSettings()
      } else {
        showToast('Nepodařilo se uložit nastavení', 'error')
      }
    } catch (error) {
      console.error('Chyba při ukládání nastavení:', error)
      showToast('Nepodařilo se uložit nastavení', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleResetDatabase() {
    setResetting(true)

    try {
      const response = await fetch('/api/settings/reset-database', {
        method: 'POST',
      })

      const result = await response.json()

      if (response.ok) {
        showToast('Databáze byla úspěšně resetována', 'success')
        setShowResetConfirm(false)
        setTimeout(() => window.location.reload(), 1500)
      } else {
        showToast(`Chyba: ${result.error}`, 'error')
      }
    } catch (error) {
      console.error('Chyba při resetování databáze:', error)
      showToast('Nepodařilo se resetovat databázi', 'error')
    } finally {
      setResetting(false)
    }
  }

  async function handleToggleVatPayer() {
    const newValue = !(settings?.isVatPayer ?? true)

    const confirmMessage = newValue
      ? 'Přepínáte se na PLÁTCE DPH.\n\nVšechny produkty budou nastaveny na sazbu 21%.\n\nChcete pokračovat?'
      : 'Přepínáte se na NEPLÁTCE DPH.\n\nVšechny produkty budou nastaveny na 0% a DIČ bude vymazáno.\n\nChcete pokračovat?'

    if (!confirm(confirmMessage)) return

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVatPayer: newValue })
      })
      if (res.ok) {
        const updated = await res.json()
        setSettings(updated)
        if (!newValue) {
          setFormData(prev => ({ ...prev, dic: '' }))
        }
        showToast(
          newValue
            ? 'Přepnuto na plátce DPH – produkty nastaveny na 21%'
            : 'Přepnuto na neplátce DPH – produkty nastaveny na 0%',
          'success'
        )
      } else {
        showToast('Chyba při změně statusu DPH', 'error')
      }
    } catch (error) {
      console.error('Chyba při ukládání:', error)
      showToast('Chyba při změně statusu DPH', 'error')
    }
  }

  async function handleToggleNegativeStock() {
    const newValue = !(settings?.allowNegativeStock || false)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowNegativeStock: newValue })
      })
      if (res.ok) {
        const updated = await res.json()
        setSettings(updated)
        showToast(
          newValue ? 'Záporný sklad povolen' : 'Záporný sklad zakázán',
          'success'
        )
      }
    } catch (error) {
      console.error('Chyba při ukládání:', error)
      showToast('Chyba při ukládání nastavení', 'error')
    }
  }

  async function fetchApiKeys() {
    setApiKeysLoading(true)
    try {
      const res = await fetch('/api/api-keys')
      if (res.ok) setApiKeys(await res.json())
    } catch {
      showToast('Nepodařilo se načíst API klíče', 'error')
    } finally {
      setApiKeysLoading(false)
    }
  }

  async function handleCreateApiKey() {
    if (!newKeyName.trim()) return
    setCreatingKey(true)
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setJustCreatedKey(data.key)
        setNewKeyName('')
        await fetchApiKeys()
        showToast('API klíč byl vytvořen. Zkopíruj ho — nebude znovu zobrazen!', 'warning')
      } else {
        showToast('Nepodařilo se vytvořit API klíč', 'error')
      }
    } catch {
      showToast('Nepodařilo se vytvořit API klíč', 'error')
    } finally {
      setCreatingKey(false)
    }
  }

  async function handleToggleApiKey(id: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/api-keys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (res.ok) {
        await fetchApiKeys()
        showToast(isActive ? 'Klíč deaktivován' : 'Klíč aktivován', 'success')
      }
    } catch {
      showToast('Nepodařilo se aktualizovat klíč', 'error')
    }
  }

  async function handleDeleteApiKey(id: string) {
    if (!confirm('Opravdu smazat tento API klíč? E-shop přestane fungovat!')) return
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchApiKeys()
        showToast('API klíč byl smazán', 'success')
      }
    } catch {
      showToast('Nepodařilo se smazat klíč', 'error')
    }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const tabs: { id: Tab; label: string; icon: typeof Building2; description: string }[] = [
    { id: 'company', label: 'Firma', icon: Building2, description: 'Údaje společnosti' },
    { id: 'invoicing', label: 'Fakturace', icon: FileText, description: 'DPH a číslovací řady' },
    { id: 'system', label: 'Systém', icon: Settings, description: 'Sklad a databáze' },
    { id: 'api', label: 'API klíče', icon: Key, description: 'Přístup e-shopu' },
  ]

  if (loading) {
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
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm animate-slide-in-right min-w-[300px] ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />}
            {toast.type === 'error' && <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />}
            {toast.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />}
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-current opacity-50 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Hlavička */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-l-4 border-slate-500 rounded-lg shadow-sm py-4 px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-700 flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Nastavení
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Údaje společnosti, fakturace a systémová nastavení
            </p>
          </div>
          {hasChanges && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-medium">Neuložené změny</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-white shadow-md border border-gray-200 text-slate-800'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/60 border border-transparent'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : ''}`} />
              <div className="text-left">
                <div>{tab.label}</div>
                <div className={`text-xs font-normal ${isActive ? 'text-gray-500' : 'text-gray-400'}`}>
                  {tab.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Tab: Firma */}
      {activeTab === 'company' && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Identifikace */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-100">
              <h2 className="text-base font-semibold text-blue-900 flex items-center gap-2">
                <Building2 className="h-4.5 w-4.5 text-blue-600" />
                Identifikace firmy
              </h2>
              <p className="text-xs text-blue-600 mt-0.5">Základní údaje, které se tisknou na fakturách</p>
            </div>
            <CardContent className="p-6 pt-6">
              <div className="space-y-4">
                {/* Název */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                    <Building2 className="h-3.5 w-3.5 text-gray-400" />
                    Název společnosti
                  </label>
                  <Input
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Moje firma s.r.o."
                    className="text-base"
                  />
                </div>

                {/* IČ + DIČ grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                      <Hash className="h-3.5 w-3.5 text-gray-400" />
                      IČ
                    </label>
                    <Input
                      value={formData.ico}
                      onChange={(e) => setFormData({ ...formData, ico: e.target.value })}
                      placeholder="12345678"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                      <Hash className="h-3.5 w-3.5 text-gray-400" />
                      DIČ
                    </label>
                    <Input
                      value={formData.dic}
                      onChange={(e) => setFormData({ ...formData, dic: e.target.value })}
                      placeholder="CZ12345678"
                      disabled={!(settings?.isVatPayer ?? true)}
                      className={!(settings?.isVatPayer ?? true) ? 'bg-gray-50' : ''}
                    />
                    {!(settings?.isVatPayer ?? true) && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Nejste plátce DPH – DIČ se nevyplňuje
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Kontaktní údaje */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-emerald-100">
              <h2 className="text-base font-semibold text-emerald-900 flex items-center gap-2">
                <Phone className="h-4.5 w-4.5 text-emerald-600" />
                Kontaktní údaje
              </h2>
              <p className="text-xs text-emerald-600 mt-0.5">Adresa, telefon a email</p>
            </div>
            <CardContent className="p-6 pt-6">
              <div className="space-y-4">
                {/* Adresa */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    Adresa
                  </label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Ulice 123, 110 00 Praha 1"
                  />
                </div>

                {/* Telefon + Email grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      Telefon
                    </label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+420 123 456 789"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      Email
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="info@firma.cz"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Platební údaje */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-amber-100">
              <h2 className="text-base font-semibold text-amber-900 flex items-center gap-2">
                <Landmark className="h-4.5 w-4.5 text-amber-600" />
                Platební údaje
              </h2>
              <p className="text-xs text-amber-600 mt-0.5">Bankovní spojení a logo</p>
            </div>
            <CardContent className="p-6 pt-6">
              <div className="space-y-4">
                {/* Bankovní účet */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-gray-400" />
                    Číslo účtu
                  </label>
                  <Input
                    value={formData.bankAccount}
                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                    placeholder="123456789/0100"
                  />
                </div>

                {/* Logo */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image className="h-3.5 w-3.5 text-gray-400" />
                    Logo
                    <span className="text-xs font-normal text-gray-400">(volitelné)</span>
                  </label>
                  <Input
                    value={formData.logo}
                    onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                    placeholder="URL adresa nebo base64 string"
                  />
                  {formData.logo && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-xs text-gray-500 mb-2">Náhled:</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.logo}
                        alt="Logo náhled"
                        className="max-h-16 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Uložit tlačítko */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {hasChanges && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData(originalFormData)
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Zahodit změny
                </button>
              )}
            </div>
            <Button type="submit" disabled={saving || !hasChanges} size="lg">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Ukládám...' : 'Uložit nastavení'}
            </Button>
          </div>
        </form>
      )}

      {/* Tab: Fakturace */}
      {activeTab === 'invoicing' && (
        <div className="space-y-5">
          {/* DPH přepínač */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-100">
              <h2 className="text-base font-semibold text-blue-900 flex items-center gap-2">
                <Receipt className="h-4.5 w-4.5 text-blue-600" />
                Plátce DPH
              </h2>
              <p className="text-xs text-blue-600 mt-0.5">Nastavení ovlivňuje sazby DPH u všech produktů</p>
            </div>
            <CardContent className="p-6 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {settings?.isVatPayer ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Plátce DPH
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
                        <XCircle className="h-3.5 w-3.5" />
                        Neplátce DPH
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {settings?.isVatPayer
                      ? 'U produktů můžete nastavovat sazby DPH (21%, 12%, 0%)'
                      : 'U všech produktů je automaticky nastaveno "Neplátce DPH"'
                    }
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleVatPayer}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    settings?.isVatPayer ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      settings?.isVatPayer ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Číslovací řada */}
          {settings && (
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 px-6 py-4 border-b border-purple-100">
                <h2 className="text-base font-semibold text-purple-900 flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5 text-purple-600" />
                  Číslovací řada faktur
                </h2>
                <p className="text-xs text-purple-600 mt-0.5">Automatické číslování vydaných faktur</p>
              </div>
              <CardContent className="p-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Aktuální číslo */}
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Poslední faktura</p>
                    <p className="text-3xl font-bold text-gray-900 font-mono">
                      {settings.lastIssuedInvoiceYear || new Date().getFullYear()}
                      {String(settings.lastIssuedInvoiceNumber).padStart(3, '0')}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Rok {settings.lastIssuedInvoiceYear || new Date().getFullYear()}, pořadové č. {settings.lastIssuedInvoiceNumber}
                    </p>
                  </div>

                  {/* Další číslo */}
                  <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                    <p className="text-xs font-medium text-blue-500 uppercase tracking-wide mb-2">Další faktura</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold text-blue-700 font-mono">
                        {new Date().getFullYear()}
                        {String(
                          settings.lastIssuedInvoiceYear === new Date().getFullYear()
                            ? settings.lastIssuedInvoiceNumber + 1
                            : 1
                        ).padStart(3, '0')}
                      </p>
                      <ChevronRight className="h-5 w-5 text-blue-400" />
                    </div>
                    <p className="text-xs text-blue-400 mt-1">
                      {settings.lastIssuedInvoiceYear !== new Date().getFullYear()
                        ? 'Nový rok – číslování od 1'
                        : 'Automaticky přiřazeno'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Systém */}
      {activeTab === 'system' && (
        <div className="space-y-5">
          {/* Skladové nastavení */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-6 py-4 border-b border-emerald-100">
              <h2 className="text-base font-semibold text-emerald-900 flex items-center gap-2">
                <Package className="h-4.5 w-4.5 text-emerald-600" />
                Sklad
              </h2>
              <p className="text-xs text-emerald-600 mt-0.5">Nastavení chování skladu</p>
            </div>
            <CardContent className="p-6 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-sm font-medium text-gray-900">
                      Povolit vyskladnění do mínusu
                    </p>
                    {settings?.allowNegativeStock ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                        Povoleno
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                        Zakázáno
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {settings?.allowNegativeStock
                      ? 'Systém umožní vyskladnit více, než je na skladě'
                      : 'Systém neumožní vyskladnit více, než je na skladě'
                    }
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleNegativeStock}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    settings?.allowNegativeStock ? 'bg-emerald-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      settings?.allowNegativeStock ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Nebezpečná zóna */}
          <Card className="overflow-hidden border-red-200">
            <div className="bg-gradient-to-r from-red-50 to-rose-50 px-6 py-4 border-b border-red-100">
              <h2 className="text-base font-semibold text-red-800 flex items-center gap-2">
                <Shield className="h-4.5 w-4.5 text-red-600" />
                Nebezpečná zóna
              </h2>
              <p className="text-xs text-red-500 mt-0.5">Nevratné akce – postupujte opatrně</p>
            </div>
            <CardContent className="p-6 pt-6">
              <div className="bg-red-50/50 rounded-xl p-5 border border-red-100">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-red-100 rounded-lg flex-shrink-0">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Reset databáze</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Smaže všechna transakční data. Zachová se:
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {['Nastavení firmy', 'Katalog produktů', 'Kategorie', 'Zákazníci', 'Dodavatelé'].map(item => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200"
                        >
                          <CheckCircle className="h-3 w-3" />
                          {item}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-5">
                      {['Objednávky', 'Příjemky', 'Výdejky', 'Faktury', 'Sklad', 'Rezervace'].map(item => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium border border-red-200"
                        >
                          <XCircle className="h-3 w-3" />
                          {item}
                        </span>
                      ))}
                    </div>

                    {!showResetConfirm ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setShowResetConfirm(true)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Reset databáze
                      </Button>
                    ) : (
                      <div className="bg-white border-2 border-red-300 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          <p className="text-sm font-bold text-red-700">
                            OPRAVDU chcete resetovat databázi?
                          </p>
                        </div>
                        <p className="text-xs text-gray-600">
                          Tato akce je NEVRATNÁ. Všechny doklady a skladové pohyby budou smazány.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={handleResetDatabase}
                            disabled={resetting}
                          >
                            {resetting ? 'Mažu...' : 'ANO, resetovat'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowResetConfirm(false)}
                            disabled={resetting}
                          >
                            Zrušit
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: API klíče */}
      {activeTab === 'api' && (
        <div className="space-y-5">
          {/* Info */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-4 border-b border-violet-100">
              <h2 className="text-base font-semibold text-violet-900 flex items-center gap-2">
                <Globe className="h-4 w-4 text-violet-600" />
                API klíče pro e-shop
              </h2>
              <p className="text-xs text-violet-600 mt-0.5">
                Klíče umožňují e-shopu číst produkty a stav skladu z ERP a vytvářet objednávky
              </p>
            </div>
            <CardContent className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 flex gap-3">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
                <div>
                  <p className="font-medium">Jak to funguje</p>
                  <ol className="mt-1 list-decimal list-inside space-y-0.5 text-blue-700">
                    <li>Vytvoř klíč níže a zkopíruj ho</li>
                    <li>Vlož ho do nastavení e-shopu jako <code className="bg-blue-100 px-1 rounded">ERP_API_KEY</code></li>
                    <li>E-shop pak automaticky čte produkty a sklad z ERP</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vytvoření nového klíče */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-6 py-4 border-b border-emerald-100">
              <h2 className="text-base font-semibold text-emerald-900 flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-600" />
                Nový API klíč
              </h2>
            </div>
            <CardContent className="p-6">
              <div className="flex gap-3">
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Název klíče (např. Eshop Weedej - Vercel)"
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateApiKey()}
                />
                <Button
                  onClick={handleCreateApiKey}
                  disabled={creatingKey || !newKeyName.trim()}
                >
                  {creatingKey ? 'Generuji...' : 'Vygenerovat klíč'}
                </Button>
              </div>

              {/* Zobrazení nově vygenerovaného klíče */}
              {justCreatedKey && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800 font-medium text-sm mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Tento klíč se zobrazí pouze jednou — zkopíruj ho!
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white border border-amber-200 rounded px-3 py-2 text-sm font-mono text-gray-800 break-all">
                      {justCreatedKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(justCreatedKey)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white rounded text-sm font-medium hover:bg-amber-700 transition-colors whitespace-nowrap"
                    >
                      {copiedKey ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copiedKey ? 'Zkopírováno!' : 'Kopírovat'}
                    </button>
                  </div>
                  <button
                    onClick={() => setJustCreatedKey(null)}
                    className="mt-2 text-xs text-amber-600 hover:text-amber-800"
                  >
                    Zavřít (ujisti se že jsi klíč zkopíroval)
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seznam existujících klíčů */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Key className="h-4 w-4 text-slate-600" />
                Existující klíče ({apiKeys.length})
              </h2>
            </div>
            <CardContent className="p-0">
              {apiKeysLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">
                  Žádné API klíče. Vytvoř první klíč výše.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {apiKeys.map((apiKey) => (
                    <div key={apiKey.id} className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${apiKey.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{apiKey.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{apiKey.keyPreview}</p>
                          <p className="text-xs text-gray-400">
                            Vytvořen: {new Date(apiKey.createdAt).toLocaleDateString('cs-CZ')}
                            {apiKey.lastUsedAt && ` · Použit: ${new Date(apiKey.lastUsedAt).toLocaleDateString('cs-CZ')}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${apiKey.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {apiKey.isActive ? 'Aktivní' : 'Neaktivní'}
                        </span>
                        <button
                          onClick={() => handleToggleApiKey(apiKey.id, apiKey.isActive)}
                          className="text-xs px-2 py-1 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          {apiKey.isActive ? 'Deaktivovat' : 'Aktivovat'}
                        </button>
                        <button
                          onClick={() => handleDeleteApiKey(apiKey.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dostupné endpointy */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Globe className="h-4 w-4 text-slate-600" />
                Dostupné API endpointy
              </h2>
            </div>
            <CardContent className="p-6">
              <div className="space-y-2 text-sm font-mono">
                {[
                  { method: 'GET', path: '/api/external/products', desc: 'Seznam aktivních produktů se stavem skladu' },
                  { method: 'GET', path: '/api/external/stock?ids=id1,id2', desc: 'Stav skladu pro vybrané produkty' },
                  { method: 'GET', path: '/api/external/orders?stripeSessionId=xxx', desc: 'Stav objednávky' },
                  { method: 'POST', path: '/api/external/orders', desc: 'Vytvoř objednávku z e-shopu' },
                ].map((ep) => (
                  <div key={ep.path} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${ep.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {ep.method}
                    </span>
                    <div>
                      <code className="text-gray-800">{ep.path}</code>
                      <p className="text-xs text-gray-400 font-sans mt-0.5">{ep.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-gray-400">
                Hlavička: <code className="bg-gray-100 px-1 rounded">X-API-Key: {'<klíč>'}</code>
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
