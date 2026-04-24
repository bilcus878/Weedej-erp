'use client'

import { useEffect, useState } from 'react'
import type { AppSettings, ApiKeyItem, Toast, CompanyFormData, SettingsTab } from '../types'
import {
  fetchSettings as fetchSettingsService,
  updateSettings,
  resetDatabase as resetDatabaseService,
  fetchApiKeys as fetchApiKeysService,
  createApiKey as createApiKeyService,
  toggleApiKey as toggleApiKeyService,
  deleteApiKey as deleteApiKeyService,
} from '../services/settingsService'

let toastId = 0

const emptyForm: CompanyFormData = {
  companyName: '', ico: '', dic: '', address: '', phone: '', email: '', bankAccount: '', logo: '',
}

export function useSettings() {
  const [settings,         setSettings]         = useState<AppSettings | null>(null)
  const [loading,          setLoading]          = useState(true)
  const [saving,           setSaving]           = useState(false)
  const [resetting,        setResetting]        = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [activeTab,        setActiveTab]        = useState<SettingsTab>('company')

  const [apiKeys,        setApiKeys]        = useState<ApiKeyItem[]>([])
  const [apiKeysLoading, setApiKeysLoading] = useState(false)
  const [newKeyName,     setNewKeyName]     = useState('')
  const [creatingKey,    setCreatingKey]    = useState(false)
  const [justCreatedKey, setJustCreatedKey] = useState<string | null>(null)
  const [copiedKey,      setCopiedKey]      = useState(false)

  const [toasts,      setToasts]      = useState<Toast[]>([])
  const [formData,    setFormData]    = useState<CompanyFormData>(emptyForm)
  const [originalFD,  setOriginalFD]  = useState<CompanyFormData>(emptyForm)
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalFD)

  function showToast(message: string, type: Toast['type']) {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  function dismissToast(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  async function loadSettings() {
    try {
      const data = await fetchSettingsService()
      setSettings(data)
      const fd: CompanyFormData = {
        companyName: data.companyName || '', ico: data.ico || '',
        dic: data.dic || '', address: data.address || '',
        phone: data.phone || '', email: data.email || '',
        bankAccount: data.bankAccount || '', logo: data.logo || '',
      }
      setFormData(fd); setOriginalFD(fd)
    } catch {
      showToast('Nepodařilo se načíst nastavení', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateSettings(formData)
      showToast('Nastavení úspěšně uloženo', 'success')
      await loadSettings()
    } catch {
      showToast('Nepodařilo se uložit nastavení', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleResetDatabase() {
    setResetting(true)
    try {
      await resetDatabaseService()
      showToast('Databáze byla úspěšně resetována', 'success')
      setShowResetConfirm(false)
      setTimeout(() => window.location.reload(), 1500)
    } catch (err: unknown) {
      showToast(err instanceof Error ? `Chyba: ${err.message}` : 'Nepodařilo se resetovat', 'error')
    } finally {
      setResetting(false)
    }
  }

  async function handleToggleVatPayer() {
    const newValue = !(settings?.isVatPayer ?? true)
    const msg = newValue
      ? 'Přepínáte se na PLÁTCE DPH.\n\nVšechny produkty budou nastaveny na sazbu 21%.\n\nChcete pokračovat?'
      : 'Přepínáte se na NEPLÁTCE DPH.\n\nVšechny produkty budou nastaveny na 0% a DIČ bude vymazáno.\n\nChcete pokračovat?'
    if (!confirm(msg)) return
    try {
      const updated = await updateSettings({ isVatPayer: newValue })
      setSettings(updated)
      if (!newValue) setFormData(prev => ({ ...prev, dic: '' }))
      showToast(newValue ? 'Přepnuto na plátce DPH' : 'Přepnuto na neplátce DPH', 'success')
    } catch {
      showToast('Chyba při změně statusu DPH', 'error')
    }
  }

  async function handleToggleNegativeStock() {
    const newValue = !(settings?.allowNegativeStock || false)
    try {
      const updated = await updateSettings({ allowNegativeStock: newValue })
      setSettings(updated)
      showToast(newValue ? 'Záporný sklad povolen' : 'Záporný sklad zakázán', 'success')
    } catch {
      showToast('Chyba při ukládání nastavení', 'error')
    }
  }

  async function loadApiKeys() {
    setApiKeysLoading(true)
    try {
      setApiKeys(await fetchApiKeysService())
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
      const data = await createApiKeyService(newKeyName.trim())
      setJustCreatedKey(data.key)
      setNewKeyName('')
      await loadApiKeys()
      showToast('API klíč byl vytvořen. Zkopíruj ho — nebude znovu zobrazen!', 'warning')
    } catch {
      showToast('Nepodařilo se vytvořit API klíč', 'error')
    } finally {
      setCreatingKey(false)
    }
  }

  async function handleToggleApiKey(id: string, isActive: boolean) {
    try {
      const res = await toggleApiKeyService(id, isActive)
      if (res.ok) { await loadApiKeys(); showToast(isActive ? 'Klíč deaktivován' : 'Klíč aktivován', 'success') }
    } catch {
      showToast('Nepodařilo se aktualizovat klíč', 'error')
    }
  }

  async function handleDeleteApiKey(id: string) {
    if (!confirm('Opravdu smazat tento API klíč? E-shop přestane fungovat!')) return
    try {
      const res = await deleteApiKeyService(id)
      if (res.ok) { await loadApiKeys(); showToast('API klíč byl smazán', 'success') }
    } catch {
      showToast('Nepodařilo se smazat klíč', 'error')
    }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  useEffect(() => { loadSettings() }, [])
  useEffect(() => { if (activeTab === 'api') loadApiKeys() }, [activeTab])

  return {
    settings, loading, saving, resetting,
    showResetConfirm, setShowResetConfirm,
    activeTab, setActiveTab,
    apiKeys, apiKeysLoading,
    newKeyName, setNewKeyName,
    creatingKey, justCreatedKey, setJustCreatedKey,
    copiedKey,
    toasts, formData, setFormData, hasChanges, originalFD,
    showToast, dismissToast,
    handleSubmit, handleResetDatabase,
    handleToggleVatPayer, handleToggleNegativeStock,
    handleCreateApiKey, handleToggleApiKey, handleDeleteApiKey,
    copyToClipboard,
  }
}
