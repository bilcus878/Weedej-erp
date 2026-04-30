import {
  Warehouse, ShoppingCart, Receipt, Users, Package,
  PackageCheck, PackageMinus, ClipboardList,
  FileText, CreditCard, Globe, FileOutput, Truck, FlaskConical,
  ShieldCheck, BarChart2, Calculator, RotateCcw, Settings,
  LayoutDashboard, TrendingUp, Building2, Key,
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
      { label: 'Od zákazníků',  href: '/customer-orders', icon: ShoppingCart },
      { label: 'K dodavatelům', href: '/purchase-orders', icon: FileText     },
      { label: 'E-shop',        href: '/eshop-orders',    icon: Globe        },
      { label: 'SumUp',         href: '/transactions',    icon: CreditCard   },
      { label: 'Reklamace',     href: '/returns',         icon: RotateCcw    },
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
      // All hrefs use ?tab=X so the analytics page can deep-link to the correct section.
      // TabId values match AnalyticsDashboard: overview|sales|customers|products|financial
      { label: 'Přehled',   href: '/analytics?tab=overview',  icon: LayoutDashboard },
      { label: 'Prodeje',   href: '/analytics?tab=sales',     icon: TrendingUp      },
      { label: 'Zákazníci', href: '/analytics?tab=customers', icon: Users           },
      { label: 'Produkty',  href: '/analytics?tab=products',  icon: Package         },
      { label: 'Finance',   href: '/analytics?tab=financial', icon: Calculator      },
    ],
  },
  {
    label: 'Nastavení',
    icon: Settings,
    triggerMode: 'hover',
    dropdownWidth: 'w-60',
    children: [
      { label: 'Produkty',  href: '/products', icon: Package },
      // ── Nastavení section ─────────────────────────────────────────────────────
      // Links use ?tab=X so the settings page opens on the correct tab.
      // TabId values match useSettings / SettingsPage: company|invoicing|system|api
      { label: 'Firma',     href: '/settings?tab=company',   icon: Building2, sectionLabel: 'Nastavení' },
      { label: 'Fakturace', href: '/settings?tab=invoicing', icon: FileText                             },
      { label: 'Systém',    href: '/settings?tab=system',    icon: Settings                             },
      { label: 'API klíče', href: '/settings?tab=api',       icon: Key                                  },
      // ── Administrace section (ADMIN role only) ────────────────────────────────
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
