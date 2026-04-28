'use client'

import {
  Warehouse, ShoppingCart, FileText, Users, Package,
  PackageCheck, PackageMinus, ClipboardList, Globe,
  CreditCard, Receipt, FlaskConical,
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Sklad', color: 'emerald',
    links: [
      { href: '/inventory',           label: 'Skladová evidence', icon: Warehouse    },
      { href: '/receipts',            label: 'Příjemky',          icon: PackageCheck },
      { href: '/delivery-notes',      label: 'Výdejky',           icon: PackageMinus },
      { href: '/inventory/inventura', label: 'Inventura',         icon: ClipboardList },
      { href: '/batches',             label: 'Šarže',             icon: FlaskConical },
    ],
  },
  {
    label: 'Objednávky', color: 'orange',
    links: [
      { href: '/customer-orders', label: 'Zákaznické',   icon: ShoppingCart },
      { href: '/purchase-orders', label: 'Nákupní',      icon: Package      },
      { href: '/eshop-orders',    label: 'E-shop',       icon: Globe        },
      { href: '/transactions',    label: 'SumUp',        icon: CreditCard   },
    ],
  },
  {
    label: 'Fakturace', color: 'blue',
    links: [
      { href: '/invoices/received', label: 'Přijaté faktury',   icon: Receipt   },
      { href: '/invoices/issued',   label: 'Vystavené faktury', icon: FileText  },
      { href: '/credit-notes',      label: 'Dobropisy',         icon: FileText  },
    ],
  },
  {
    label: 'Kontakty', color: 'slate',
    links: [
      { href: '/customers', label: 'Odběratelé', icon: Users  },
      { href: '/suppliers', label: 'Dodavatelé', icon: Users  },
      { href: '/products',  label: 'Katalog',    icon: Package },
    ],
  },
] as const

const COLOR: Record<string, { header: string; iconBg: string; link: string }> = {
  emerald: { header: 'text-emerald-700', iconBg: 'text-emerald-600', link: 'hover:text-emerald-700' },
  orange:  { header: 'text-orange-700',  iconBg: 'text-orange-600',  link: 'hover:text-orange-700'  },
  blue:    { header: 'text-blue-700',    iconBg: 'text-blue-600',    link: 'hover:text-blue-700'    },
  slate:   { header: 'text-slate-700',   iconBg: 'text-slate-600',   link: 'hover:text-slate-700'   },
}

export function QuickNavCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900">Rychlá navigace</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-y divide-gray-100">
        {NAV_SECTIONS.map(section => {
          const c = COLOR[section.color]
          return (
            <div key={section.label} className="p-5">
              <p className={`text-[10px] font-semibold uppercase tracking-wide mb-3 ${c.header}`}>
                {section.label}
              </p>
              <ul className="space-y-1.5">
                {section.links.map(link => {
                  const Icon = link.icon
                  return (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className={`flex items-center gap-2 text-xs text-gray-600 ${c.link} transition-colors`}
                      >
                        <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${c.iconBg}`} />
                        <span>{link.label}</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
