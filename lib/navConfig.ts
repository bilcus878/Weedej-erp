import {
  Warehouse, ShoppingCart, Receipt, Users, Package,
  PackageCheck, PackageMinus, ClipboardList,
  FileText, CreditCard, Globe, FileOutput, Truck, FlaskConical,
  ShieldCheck, BarChart2, Calculator, RotateCcw, Settings,
  LayoutDashboard, TrendingUp,
} from 'lucide-react'

export interface NavChild {
  label:          string
  href:           string
  icon:           any
  permission?:    string
  dividerBefore?: boolean
}

export interface NavGroup {
  label:        string
  icon:         any
  triggerMode?: 'hover' | 'click'
  children:     NavChild[]
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
      { label: 'Od zákazníků',  href: '/customer-orders',  icon: ShoppingCart },
      { label: 'K dodavatelům', href: '/purchase-orders',  icon: FileText     },
      { label: 'E-shop',        href: '/eshop-orders',     icon: Globe        },
      { label: 'Reklamace',     href: '/returns',          icon: RotateCcw    },
      { label: 'Platby',        href: '/transactions',     icon: CreditCard   },
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
      { label: 'Přehled',   href: '/analytics',           icon: LayoutDashboard },
      { label: 'Prodeje',   href: '/analytics/sales',     icon: TrendingUp      },
      { label: 'Zákazníci', href: '/analytics/customers', icon: Users           },
      { label: 'Produkty',  href: '/analytics/products',  icon: Package         },
      { label: 'Finance',   href: '/analytics/finance',   icon: Calculator      },
    ],
  },
  {
    label: 'Nastavení',
    icon: Settings,
    triggerMode: 'click',
    children: [
      { label: 'Produkty', href: '/products', icon: Package  },
      { label: 'Obecné',   href: '/settings', icon: Settings },
      { label: 'Uživatelé', href: '/users',      icon: Users,        permission: 'MANAGE_USERS',  dividerBefore: true },
      { label: 'Role',      href: '/roles',      icon: ShieldCheck,  permission: 'MANAGE_ROLES'               },
      { label: 'Audit log', href: '/audit-logs', icon: ClipboardList, permission: 'VIEW_AUDIT_LOG'            },
    ],
  },
]

export function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard'
  for (const group of navGroups) {
    for (const child of group.children) {
      if (pathname === child.href || pathname.startsWith(child.href + '/')) {
        return child.label
      }
    }
  }
  return ''
}
