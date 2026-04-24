'use client'

import { Zap, Warehouse, ShoppingCart, FileText, Users, Settings } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'

export function QuickNavCard() {
  const sections = [
    {
      href: '/inventory/dashboard', icon: Warehouse, color: 'emerald',
      label: 'Sklad',
      links: [
        { href: '/inventory',           label: 'Skladová evidence' },
        { href: '/receipts',            label: 'Příjemky' },
        { href: '/delivery-notes',      label: 'Výdejky' },
        { href: '/inventory/inventura', label: 'Inventura' },
      ],
    },
    {
      href: '/orders/dashboard', icon: ShoppingCart, color: 'blue',
      label: 'Objednávky',
      links: [
        { href: '/purchase-orders',  label: 'Vydané' },
        { href: '/customer-orders',  label: 'Vystavené' },
        { href: '/transactions',     label: 'SumUp' },
        { href: '/eshop-orders',     label: 'Eshop' },
      ],
    },
    {
      href: '/invoices/dashboard', icon: FileText, color: 'rose',
      label: 'Faktury',
      links: [
        { href: '/invoices/received', label: 'Přijaté' },
        { href: '/invoices/issued',   label: 'Vystavené' },
        { href: '/credit-notes',      label: 'Dobropisy' },
      ],
    },
    {
      href: '/customers/dashboard', icon: Users, color: 'amber',
      label: 'Kontakty',
      links: [
        { href: '/suppliers', label: 'Dodavatelé' },
        { href: '/customers', label: 'Odběratelé' },
      ],
    },
    {
      href: '/settings', icon: Settings, color: 'slate',
      label: 'Nastavení',
      links: [
        { href: '/settings', label: 'Obecné' },
        { href: '/products', label: 'Katalog zboží' },
      ],
    },
  ] as const

  const colorMap: Record<string, { bg: string; hover: string; text: string; linkHover: string }> = {
    emerald: { bg: 'bg-emerald-200',  hover: 'group-hover:bg-emerald-300',  text: 'text-emerald-800', linkHover: 'hover:text-emerald-700' },
    blue:    { bg: 'bg-blue-200',     hover: 'group-hover:bg-blue-300',     text: 'text-blue-800',    linkHover: 'hover:text-blue-700' },
    rose:    { bg: 'bg-rose-200',     hover: 'group-hover:bg-rose-300',     text: 'text-rose-800',    linkHover: 'hover:text-rose-700' },
    amber:   { bg: 'bg-amber-200',    hover: 'group-hover:bg-amber-300',    text: 'text-amber-800',   linkHover: 'hover:text-amber-700' },
    slate:   { bg: 'bg-slate-200',    hover: 'group-hover:bg-slate-300',    text: 'text-slate-800',   linkHover: 'hover:text-slate-700' },
  }

  const borderMap: Record<string, string> = {
    emerald: 'from-emerald-50 to-teal-50 border-emerald-200',
    blue:    'from-blue-50 to-indigo-50 border-blue-200',
    rose:    'from-rose-50 to-pink-50 border-rose-200',
    amber:   'from-amber-50 to-orange-50 border-amber-200',
    slate:   'from-slate-50 to-gray-100 border-slate-200',
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />Rychlá navigace
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map(section => {
            const Icon    = section.icon
            const colors  = colorMap[section.color]
            const borders = borderMap[section.color]
            return (
              <div key={section.href} className={`bg-gradient-to-br ${borders} border rounded-xl p-4`}>
                <a href={section.href} className="flex items-center gap-2 mb-3 group">
                  <div className={`p-2 ${colors.bg} rounded-lg ${colors.hover} transition-colors`}>
                    <Icon className="h-4 w-4" style={{ color: 'inherit' }} />
                  </div>
                  <span className={`text-sm font-semibold ${colors.text} group-hover:underline`}>{section.label}</span>
                </a>
                <div className="space-y-1 ml-1">
                  {section.links.map(link => (
                    <a key={link.href} href={link.href} className={`block text-xs text-gray-600 ${colors.linkHover} hover:underline py-0.5`}>
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
