'use client'

import { Package, Shield, Trash2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { AppSettings } from '../types'

interface Props {
  settings:            AppSettings | null
  showResetConfirm:    boolean
  resetting:           boolean
  setShowResetConfirm: (v: boolean) => void
  onToggleNegativeStock: () => void
  onResetDatabase:     () => void
}

export function SystemTab({ settings, showResetConfirm, resetting, setShowResetConfirm, onToggleNegativeStock, onResetDatabase }: Props) {
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-6 py-4 border-b border-emerald-100">
          <h2 className="text-base font-semibold text-emerald-900 flex items-center gap-2">
            <Package className="h-4.5 w-4.5 text-emerald-600" />Sklad
          </h2>
          <p className="text-xs text-emerald-600 mt-0.5">Nastavení chování skladu</p>
        </div>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <p className="text-sm font-medium text-gray-900">Povolit vyskladnění do mínusu</p>
                {settings?.allowNegativeStock ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">Povoleno</span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">Zakázáno</span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {settings?.allowNegativeStock
                  ? 'Systém umožní vyskladnit více, než je na skladě'
                  : 'Systém neumožní vyskladnit více, než je na skladě'}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleNegativeStock}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${settings?.allowNegativeStock ? 'bg-emerald-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${settings?.allowNegativeStock ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-red-200">
        <div className="bg-gradient-to-r from-red-50 to-rose-50 px-6 py-4 border-b border-red-100">
          <h2 className="text-base font-semibold text-red-800 flex items-center gap-2">
            <Shield className="h-4.5 w-4.5 text-red-600" />Nebezpečná zóna
          </h2>
          <p className="text-xs text-red-500 mt-0.5">Nevratné akce – postupujte opatrně</p>
        </div>
        <CardContent className="p-6">
          <div className="bg-red-50/50 rounded-xl p-5 border border-red-100">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-red-100 rounded-lg flex-shrink-0">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Reset databáze</h3>
                <p className="text-sm text-gray-600 mb-3">Smaže všechna transakční data. Zachová se:</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['Nastavení firmy', 'Katalog produktů', 'Kategorie', 'Zákazníci', 'Dodavatelé'].map(item => (
                    <span key={item} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200">
                      <CheckCircle className="h-3 w-3" />{item}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mb-5">
                  {['Objednávky', 'Příjemky', 'Výdejky', 'Faktury', 'Sklad', 'Rezervace'].map(item => (
                    <span key={item} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium border border-red-200">
                      <XCircle className="h-3 w-3" />{item}
                    </span>
                  ))}
                </div>

                {!showResetConfirm ? (
                  <Button variant="danger" size="sm" onClick={() => setShowResetConfirm(true)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />Reset databáze
                  </Button>
                ) : (
                  <div className="bg-white border-2 border-red-300 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <p className="text-sm font-bold text-red-700">OPRAVDU chcete resetovat databázi?</p>
                    </div>
                    <p className="text-xs text-gray-600">Tato akce je NEVRATNÁ. Všechny doklady a skladové pohyby budou smazány.</p>
                    <div className="flex gap-2">
                      <Button variant="danger" size="sm" onClick={onResetDatabase} disabled={resetting}>
                        {resetting ? 'Mažu...' : 'ANO, resetovat'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowResetConfirm(false)} disabled={resetting}>Zrušit</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
