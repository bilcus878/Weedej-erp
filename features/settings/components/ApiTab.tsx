'use client'

import { Globe, Info, Plus, Key, AlertTriangle, CheckCircle, Trash2, Copy } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { ApiKeyItem } from '../types'

interface Props {
  apiKeys:          ApiKeyItem[]
  apiKeysLoading:   boolean
  newKeyName:       string
  creatingKey:      boolean
  justCreatedKey:   string | null
  copiedKey:        boolean
  setNewKeyName:    (v: string) => void
  setJustCreatedKey:(v: string | null) => void
  onCreateKey:      () => void
  onToggleKey:      (id: string, isActive: boolean) => void
  onDeleteKey:      (id: string) => void
  onCopy:           (text: string) => void
}

export function ApiTab({
  apiKeys, apiKeysLoading, newKeyName, creatingKey, justCreatedKey, copiedKey,
  setNewKeyName, setJustCreatedKey, onCreateKey, onToggleKey, onDeleteKey, onCopy,
}: Props) {
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-4 border-b border-violet-100">
          <h2 className="text-base font-semibold text-violet-900 flex items-center gap-2">
            <Globe className="h-4 w-4 text-violet-600" />API klíče pro e-shop
          </h2>
          <p className="text-xs text-violet-600 mt-0.5">Klíče umožňují e-shopu číst produkty a stav skladu z ERP a vytvářet objednávky</p>
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

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-6 py-4 border-b border-emerald-100">
          <h2 className="text-base font-semibold text-emerald-900 flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-600" />Nový API klíč
          </h2>
        </div>
        <CardContent className="p-6">
          <div className="flex gap-3">
            <Input value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
              placeholder="Název klíče (např. Eshop Weedej - Vercel)"
              className="flex-1" onKeyDown={e => e.key === 'Enter' && onCreateKey()} />
            <Button onClick={onCreateKey} disabled={creatingKey || !newKeyName.trim()}>
              {creatingKey ? 'Generuji...' : 'Vygenerovat klíč'}
            </Button>
          </div>

          {justCreatedKey && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800 font-medium text-sm mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Tento klíč se zobrazí pouze jednou — zkopíruj ho!
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-amber-200 rounded px-3 py-2 text-sm font-mono text-gray-800 break-all">{justCreatedKey}</code>
                <button onClick={() => onCopy(justCreatedKey)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white rounded text-sm font-medium hover:bg-amber-700 transition-colors whitespace-nowrap">
                  {copiedKey ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedKey ? 'Zkopírováno!' : 'Kopírovat'}
                </button>
              </div>
              <button onClick={() => setJustCreatedKey(null)} className="mt-2 text-xs text-amber-600 hover:text-amber-800">
                Zavřít (ujisti se že jsi klíč zkopíroval)
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Key className="h-4 w-4 text-slate-600" />Existující klíče ({apiKeys.length})
          </h2>
        </div>
        <CardContent className="p-0">
          {apiKeysLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">Žádné API klíče. Vytvoř první klíč výše.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {apiKeys.map(apiKey => (
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
                    <button onClick={() => onToggleKey(apiKey.id, apiKey.isActive)} className="text-xs px-2 py-1 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition-colors">
                      {apiKey.isActive ? 'Deaktivovat' : 'Aktivovat'}
                    </button>
                    <button onClick={() => onDeleteKey(apiKey.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Globe className="h-4 w-4 text-slate-600" />Dostupné API endpointy
          </h2>
        </div>
        <CardContent className="p-6">
          <div className="space-y-2 text-sm font-mono">
            {[
              { method: 'GET',  path: '/api/external/products',              desc: 'Seznam aktivních produktů se stavem skladu' },
              { method: 'GET',  path: '/api/external/stock?ids=id1,id2',     desc: 'Stav skladu pro vybrané produkty' },
              { method: 'GET',  path: '/api/external/orders?stripeSessionId=xxx', desc: 'Stav objednávky' },
              { method: 'POST', path: '/api/external/orders',                desc: 'Vytvoř objednávku z e-shopu' },
            ].map(ep => (
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
          <p className="mt-4 text-xs text-gray-400">Hlavička: <code className="bg-gray-100 px-1 rounded">X-API-Key: {'<klíč>'}</code></p>
        </CardContent>
      </Card>
    </div>
  )
}
