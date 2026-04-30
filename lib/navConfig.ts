import {
  Warehouse, ShoppingCart, Receipt, Users, Package,
  PackageCheck, PackageMinus, ClipboardList,
  FileText, CreditCard, Globe, FileOutput, Truck, FlaskConical,
  ShieldCheck, BarChart2, Calculator, RotateCcw, Settings,
  LayoutDashboard, TrendingUp, Building2, Key, Tag,
  Activity, Megaphone,
} from 'lucide-react'

export interface NavChild {
  label:         string
  href:          string
  icon:          any
  permission?:   string
  // Renders a labeled section separator above this item.
  // Items sharing the same sectionLabel are grouped under one header.
  sectionLabel?: string
}

export interface NavGroup {
  label:          string
  icon:           any
  triggerMode?:   'hover' | 'click'
  dropdownWidth?: string   // Tailwind width class — defaults to 'w-52'
  children:       NavChild[]
}

export const navGroups: NavGroup[] = [
  {
    label: 'Sklady',
    icon: Warehouse,
    triggerMode: 'hover',
    children: [
      { label: 'Přehled skladu', href: '/inventory',           icon: Warehouse     },
      { label: 'Příjemky',       href: '/receipts',            icon: PackageCheck  },
      { label: 'Výdejky',        href: '/delivery-notes',      icon: PackageMinus  },
      { label: 'Inventura',      href: '/inventory/inventura', icon: ClipboardList },
      { label: 'Šarže',          href: '/batches',             icon: FlaskConical  },
    ],
  },
  {
    label: 'Objednávky',
    icon: ShoppingCart,
    triggerMode: 'hover',
    children: [
      // Supply-chain order: procurement (inbound) → customer fulfillment (outbound)
      { label: 'K dodavatelům', href: '/purchase-orders',  icon: FileText     },
      { label: 'Od zákazníků',  href: '/customer-orders',  icon: ShoppingCart },
      { label: 'E-shop',        href: '/eshop-orders',     icon: Globe        },
      { label: 'SumUp',         href: '/transactions',     icon: CreditCard   },
      { label: 'Reklamace',     href: '/returns',          icon: RotateCcw    },
    ],
  },
  {
    label: 'Faktury',
    icon: Receipt,
    triggerMode: 'hover',
    children: [
      { label: 'Vystavené', href: '/invoices/issued',   icon: FileText   },
      { label: 'Přijaté',   href: '/invoices/received', icon: Receipt    },
      { label: 'Dobropisy', href: '/credit-notes',      icon: FileOutput },
    ],
  },
  {
    label: 'Účetnictví',
    icon: Calculator,
    triggerMode: 'hover',
    children: [
      { label: 'Účetní export', href: '/accounting-export', icon: Calculator },
    ],
  },
  {
    label: 'Kontakty',
    icon: Users,
    triggerMode: 'hover',
    children: [
      { label: 'Odběratelé', href: '/customers', icon: Users },
      { label: 'Dodavatelé', href: '/suppliers', icon: Truck },
    ],
  },
  {
    label: 'Analytika',
    icon: BarChart2,
    triggerMode: 'hover',
    children: [
      // All 7 tabs that AnalyticsDashboard exposes — TabId must match exactly.
      { label: 'Přehled',   href: '/analytics?tab=overview',   icon: LayoutDashboard },
      { label: 'Prodeje',   href: '/analytics?tab=sales',      icon: TrendingUp      },
      { label: 'Zákazníci', href: '/analytics?tab=customers',  icon: Users           },
      { label: 'Produkty',  href: '/analytics?tab=products',   icon: Package         },
      { label: 'Finance',   href: '/analytics?tab=financial',  icon: Calculator      },
      { label: 'Operace',   href: '/analytics?tab=operations', icon: Activity        },
      { label: 'Marketing', href: '/analytics?tab=marketing',  icon: Megaphone       },
    ],
  },
  {
    label: 'Nastavení',
    icon: Settings,
    triggerMode: 'hover',
    dropdownWidth: 'w-64',
    children: [
      // ── Katalog — master data for what you sell and how you ship it ───────────
      { label: 'Produkty',  href: '/products',   icon: Package, sectionLabel: 'Katalog' },
      { label: 'Kategorie', href: '/categories', icon: Tag                               },
      { label: 'Doprava',   href: '/shipping',   icon: Truck                             },
      // ── Firma & Fakturace — legal identity and invoicing rules ────────────────
      { label: 'Firma',     href: '/settings?tab=company',   icon: Building2, sectionLabel: 'Firma & Fakturace' },
      { label: 'Fakturace', href: '/settings?tab=invoicing', icon: FileText                                     },
      // ── Systém & Integrace — runtime config and external API access ───────────
      { label: 'Systém',    href: '/settings?tab=system', icon: Settings, sectionLabel: 'Systém & Integrace' },
      { label: 'API klíče', href: '/settings?tab=api',    icon: Key                                          },
      // ── Administrace — identity, roles, tamper-evident trail (ADMIN only) ─────
      { label: 'Uživatelé', href: '/users',      icon: Users,         permission: 'MANAGE_USERS',  sectionLabel: 'Administrace' },
      { label: 'Role',      href: '/roles',      icon: ShieldCheck,   permission: 'MANAGE_ROLES'                               },
      { label: 'Audit log', href: '/audit-logs', icon: ClipboardList, permission: 'VIEW_AUDIT_LOG'                             },
    ],
  },
]

// Returns the page title for a given pathname.
// For routes driven by query params (e.g. /analytics?tab=sales, /settings?tab=api)
// the group label is returned (Analytika, Nastavení) since the active child
// can only be determined with search params — which belong to the component layer.
export function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard'
  for (const group of navGroups) {
    for (const child of group.children) {
      const childPath = child.href.split('?')[0]
      if (pathname === childPath || pathname.startsWith(childPath + '/')) {
        return child.href.includes('?') ? group.label : child.label
      }
    }
  }
  return ''
}
