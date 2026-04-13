// Sidebar navigace - moderní 2026 design
// Vždy rozbalené podmenu s elegantní hierarchií

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Receipt,
  Truck,
  Users,
  Settings,
  ShoppingCart,
  FileText,
  PackageCheck,
  PackageMinus,
  FileOutput,
  ClipboardList,
  Globe,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'

// ---------- TYPY ----------
interface SimpleNavItem {
  type: 'simple'
  name: string
  href: string
  icon: any
  color: string
}

interface GroupNavItem {
  type: 'group'
  name: string
  icon: any
  color: string
  dashboardHref: string
  children: {
    name: string
    href: string
    icon: any
  }[]
}

type NavItem = SimpleNavItem | GroupNavItem

// ---------- NAVIGAČNÍ STRUKTURA ----------
const navigation: NavItem[] = [
  {
    type: 'simple',
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    color: 'from-violet-500 to-purple-600',
  },
  {
    type: 'group',
    name: 'Skladová evidence',
    icon: Warehouse,
    color: 'from-emerald-500 to-teal-600',
    dashboardHref: '/inventory/dashboard',
    children: [
      { name: 'Skladová evidence', href: '/inventory', icon: Warehouse },
      { name: 'Příjemky', href: '/receipts', icon: PackageCheck },
      { name: 'Výdejky', href: '/delivery-notes', icon: PackageMinus },
      { name: 'Inventura', href: '/inventory/inventura', icon: ClipboardList },
    ],
  },
  {
    type: 'group',
    name: 'Objednávky',
    icon: ShoppingCart,
    color: 'from-blue-500 to-indigo-600',
    dashboardHref: '/orders/dashboard',
    children: [
      { name: 'Vydané', href: '/purchase-orders', icon: FileText },
      { name: 'Vystavené', href: '/customer-orders', icon: ShoppingCart },
      { name: 'Sumup', href: '/transactions', icon: CreditCard },
      { name: 'Eshop', href: '/eshop-orders', icon: Globe },
    ],
  },
  {
    type: 'group',
    name: 'Faktury',
    icon: Receipt,
    color: 'from-rose-500 to-pink-600',
    dashboardHref: '/invoices/dashboard',
    children: [
      { name: 'Přijaté', href: '/invoices/received', icon: Receipt },
      { name: 'Vystavené', href: '/invoices/issued', icon: FileText },
      { name: 'Dobropisy', href: '/credit-notes', icon: FileOutput },
    ],
  },
  {
    type: 'group',
    name: 'Zákazníci',
    icon: Users,
    color: 'from-amber-500 to-orange-600',
    dashboardHref: '/customers/dashboard',
    children: [
      { name: 'Dodavatelé', href: '/suppliers', icon: Truck },
      { name: 'Odběratelé', href: '/customers', icon: Users },
    ],
  },
  {
    type: 'group',
    name: 'Nastavení',
    icon: Settings,
    color: 'from-slate-400 to-gray-500',
    dashboardHref: '/settings',
    children: [
      { name: 'Katalog zboží', href: '/products', icon: Package },
      { name: 'Obecné', href: '/settings', icon: Settings },
    ],
  },
]

// ---------- POMOCNÉ FUNKCE ----------
function isPathInGroup(pathname: string, group: GroupNavItem): boolean {
  if (pathname === group.dashboardHref || pathname.startsWith(group.dashboardHref + '/')) {
    return true
  }
  return group.children.some(
    (child) => pathname === child.href || pathname.startsWith(child.href + '/')
  )
}

// ---------- HLAVNÍ KOMPONENTA ----------
export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  // Skryj sidebar na přihlašovací stránce
  if (pathname === '/login') return null

  return (
    <div
      className={`
        sidebar-root
        flex flex-col sticky top-0 min-h-screen
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[72px]' : 'w-[260px]'}
      `}
    >
      {/* Pozadí */}
      <div className="absolute inset-0 sidebar-bg" />

      {/* Obsah */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Navigace */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto sidebar-scrollbar">
          {navigation.map((item) => {
            if (item.type === 'group') {
              return (
                <GroupSection
                  key={item.name}
                  item={item}
                  pathname={pathname}
                  collapsed={collapsed}
                  hoveredItem={hoveredItem}
                  setHoveredItem={setHoveredItem}
                />
              )
            } else {
              return (
                <SimpleItem
                  key={item.name}
                  item={item}
                  pathname={pathname}
                  collapsed={collapsed}
                  hoveredItem={hoveredItem}
                  setHoveredItem={setHoveredItem}
                />
              )
            }
          })}
        </nav>

        {/* Uživatel + logout */}
        <div className="border-t border-white/[0.06] p-3 space-y-1">
          {session?.user && !collapsed && (
            <div className="px-3 py-2 rounded-xl bg-white/[0.04] mb-1">
              <p className="text-xs font-medium text-white/80 truncate">{session.user.name}</p>
              <p className="text-[10px] text-white/30 truncate">{session.user.email}</p>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="
              w-full flex items-center gap-2 rounded-xl px-3 py-2.5
              text-white/40 hover:text-red-400 hover:bg-red-500/[0.08]
              transition-all duration-200 group
            "
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span className="text-xs">Odhlásit se</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="
              w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2.5
              text-white/40 hover:text-white/70 hover:bg-white/[0.04]
              transition-all duration-200 group
            "
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 transition-transform group-hover:scale-110" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span className="text-xs">Sbalit menu</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------- SIMPLE ITEM (Dashboard, Katalog, Nastavení) ----------
function SimpleItem({
  item,
  pathname,
  collapsed,
  hoveredItem,
  setHoveredItem,
}: {
  item: SimpleNavItem
  pathname: string
  collapsed: boolean
  hoveredItem: string | null
  setHoveredItem: (v: string | null) => void
}) {
  const Icon = item.icon
  const isActive = pathname === item.href
  const isHovered = hoveredItem === item.name

  return (
    <div className="relative">
      <Link
        href={item.href}
        onMouseEnter={() => setHoveredItem(item.name)}
        onMouseLeave={() => setHoveredItem(null)}
        className={`
          sidebar-item group
          flex items-center gap-3 rounded-xl px-3 py-2.5
          transition-all duration-200 relative
          ${collapsed ? 'justify-center' : ''}
          ${isActive ? 'sidebar-item-active text-white' : 'text-white/50 hover:text-white/90'}
        `}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full sidebar-active-pill" />
        )}

        <div
          className={`
            flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0
            transition-all duration-200
            ${isActive ? `bg-gradient-to-br ${item.color} shadow-lg` : isHovered ? 'bg-white/[0.08]' : 'bg-transparent'}
          `}
        >
          <Icon className={`h-[18px] w-[18px] transition-all duration-200 ${isActive ? 'text-white' : ''}`} />
        </div>

        {!collapsed && (
          <span className="text-sm font-medium truncate">{item.name}</span>
        )}
      </Link>

      {collapsed && isHovered && (
        <div className="sidebar-tooltip">{item.name}</div>
      )}
    </div>
  )
}

// ---------- GROUP SECTION (Vždy rozbalená sekce) ----------
function GroupSection({
  item,
  pathname,
  collapsed,
  hoveredItem,
  setHoveredItem,
}: {
  item: GroupNavItem
  pathname: string
  collapsed: boolean
  hoveredItem: string | null
  setHoveredItem: (v: string | null) => void
}) {
  const Icon = item.icon
  const isActiveGroup = isPathInGroup(pathname, item)
  const isGroupHeaderActive = pathname === item.dashboardHref
  const isHovered = hoveredItem === item.name

  return (
    <div className="relative">
      {/* Sekce header - kliknutelný odkaz na dashboard */}
      <Link
        href={item.dashboardHref}
        onMouseEnter={() => setHoveredItem(item.name)}
        onMouseLeave={() => setHoveredItem(null)}
        className={`
          sidebar-item group
          flex items-center gap-3 rounded-xl px-3 py-2.5
          transition-all duration-200 relative w-full
          ${collapsed ? 'justify-center' : ''}
          ${isActiveGroup ? 'text-white' : 'text-white/50 hover:text-white/90'}
        `}
      >
        {/* Active pill pro celou skupinu */}
        {isActiveGroup && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full sidebar-active-pill" />
        )}

        <div
          className={`
            flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0
            transition-all duration-200
            ${isGroupHeaderActive ? `bg-gradient-to-br ${item.color} shadow-lg` : isHovered ? 'bg-white/[0.08]' : 'bg-transparent'}
          `}
        >
          <Icon className={`h-[18px] w-[18px] transition-all duration-200 ${isGroupHeaderActive ? 'text-white' : ''}`} />
        </div>

        {!collapsed && (
          <span className={`text-sm font-semibold truncate ${isActiveGroup ? 'text-white' : ''}`}>
            {item.name}
          </span>
        )}
      </Link>

      {/* Tooltip v collapsed režimu */}
      {collapsed && isHovered && (
        <div className="sidebar-tooltip">{item.name}</div>
      )}

      {/* Podpoložky - vždy viditelné */}
      {!collapsed && (
        <div className="mt-1 ml-[22px] pl-3 border-l border-white/[0.08] space-y-0.5">
          {item.children.map((child) => {
            const ChildIcon = child.icon
            const isChildActive = pathname === child.href

            return (
              <Link
                key={child.href}
                href={child.href}
                className={`
                  flex items-center gap-2.5 rounded-lg px-3 py-2
                  transition-all duration-200 text-[13px] group/child relative
                  ${isChildActive
                    ? 'text-white bg-white/[0.08] font-medium'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
                  }
                `}
              >
                <ChildIcon
                  className={`h-4 w-4 transition-all duration-200 flex-shrink-0 ${
                    isChildActive ? 'text-white' : 'text-white/30 group-hover/child:text-white/60'
                  }`}
                />
                <span className="truncate">{child.name}</span>

                {/* Aktivní tečka */}
                {isChildActive && (
                  <div className={`ml-auto w-1.5 h-1.5 rounded-full bg-gradient-to-r ${item.color} flex-shrink-0`} />
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
