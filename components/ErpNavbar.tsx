'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu, X, LogOut, Settings, ChevronDown, LayoutDashboard,
  Warehouse, ShoppingCart, Receipt, Users, Package,
  PackageCheck, PackageMinus, ClipboardList,
  FileText, CreditCard, Globe, FileOutput, Truck,
} from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { Logo } from '@/components/ui/Logo'
import { useNavbarMeta } from '@/components/NavbarMetaContext'

// ─── Nav struktura ────────────────────────────────────────────────────────────

interface NavGroup {
  label: string
  icon: any
  children: { label: string; href: string; icon: any }[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Skladová evidence',
    icon: Warehouse,
    children: [
      { label: 'Skladová evidence', href: '/inventory',           icon: Warehouse     },
      { label: 'Příjemky',          href: '/receipts',            icon: PackageCheck  },
      { label: 'Výdejky',           href: '/delivery-notes',      icon: PackageMinus  },
      { label: 'Inventura',         href: '/inventory/inventura', icon: ClipboardList },
    ],
  },
  {
    label: 'Objednávky',
    icon: ShoppingCart,
    children: [
      { label: 'Vydané',    href: '/purchase-orders', icon: FileText     },
      { label: 'Vystavené', href: '/customer-orders', icon: ShoppingCart },
      { label: 'Sumup',     href: '/transactions',    icon: CreditCard   },
      { label: 'Eshop',     href: '/eshop-orders',    icon: Globe        },
    ],
  },
  {
    label: 'Faktury',
    icon: Receipt,
    children: [
      { label: 'Přijaté',   href: '/invoices/received', icon: Receipt    },
      { label: 'Vystavené', href: '/invoices/issued',   icon: FileText   },
      { label: 'Dobropisy', href: '/credit-notes',      icon: FileOutput },
    ],
  },
  {
    label: 'Zákazníci',
    icon: Users,
    children: [
      { label: 'Dodavatelé', href: '/suppliers', icon: Truck },
      { label: 'Odběratelé', href: '/customers', icon: Users },
    ],
  },
  {
    label: 'Nastavení',
    icon: Settings,
    children: [
      { label: 'Katalog zboží', href: '/products', icon: Package  },
      { label: 'Obecné',        href: '/settings',  icon: Settings },
    ],
  },
]

// ─── Page title (odvozeno z navGroups — vždy synchronní) ──────────────────────

function getPageTitle(pathname: string): string {
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

// ─── User menu ────────────────────────────────────────────────────────────────

function UserMenu() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!session) return null

  const displayName = session.user?.name ?? session.user?.email?.split('@')[0] ?? 'Účet'

  return (
    <div ref={ref} className="hidden md:flex items-center relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 text-sm text-gray-700"
      >
        <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
          <span className="text-white text-[10px] font-bold uppercase">{displayName.charAt(0)}</span>
        </div>
        <span className="font-medium max-w-[120px] truncate">{displayName}</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-700 truncate">{displayName}</p>
            <p className="text-[11px] text-gray-400 break-all mt-0.5">{session.user?.email}</p>
          </div>
          <button
            onClick={() => { setOpen(false); signOut({ callbackUrl: '/login' }) }}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Odhlásit se
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Desktop dropdown ─────────────────────────────────────────────────────────
//
// Dropdown gap fix:
// The dropdown wrapper uses pt-2 as visual spacing. Since the padded area is still
// a DOM child of the onMouseLeave parent, moving the mouse through the gap never
// triggers a leave event — the hover region is continuous.

function NavDropdown({ group, pathname }: { group: NavGroup; pathname: string }) {
  const [open, setOpen] = useState(false)
  const isActive = group.children.some(
    c => pathname === c.href || pathname.startsWith(c.href + '/')
  )

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className={`flex items-center gap-1 text-sm font-medium transition-colors duration-150 py-1 ${
          isActive
            ? 'text-violet-600'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        {group.label}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 z-50">
          {/* pt-2 creates visual gap while keeping mouse within the hover zone */}
          <div className="pt-2">
            <div className="bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 w-52 ring-1 ring-black/5">
              {group.children.map(child => {
                const Icon = child.icon
                const isChildActive = pathname === child.href || pathname.startsWith(child.href + '/')
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
                      isChildActive
                        ? 'text-violet-700 bg-violet-50 font-medium'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isChildActive ? 'text-violet-500' : 'text-gray-400'}`} />
                    {child.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Hlavní komponenta ────────────────────────────────────────────────────────

export function ErpNavbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen]       = useState(false)
  const [mobileOpenGroup, setMobileOpenGroup] = useState<string | null>(null)

  const displayName = session?.user?.name ?? session?.user?.email?.split('@')[0] ?? 'Účet'
  const pageTitle   = getPageTitle(pathname)
  const { meta }    = useNavbarMeta()

  if (pathname === '/login') return null

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between px-6 md:px-10 h-[57px] bg-white border-b border-gray-200 shadow-sm">

        {/* Left: Logo + page title */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <Logo variant="dark" size="md" />
          {pageTitle && (
            <>
              <span className="text-gray-300 text-lg font-light select-none">/</span>
              <span className="text-sm font-medium text-gray-700 truncate">{pageTitle}</span>
            </>
          )}
          {meta.count && (
            <span className="text-xs text-gray-400 hidden sm:block whitespace-nowrap">{meta.count}</span>
          )}
        </div>

        {/* Center: nav groups — desktop only */}
        <div className="hidden md:flex items-center gap-7">
          <Link
            href="/"
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors duration-150 py-1 ${
              pathname === '/' ? 'text-violet-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          {navGroups.map(group => (
            <NavDropdown key={group.label} group={group} pathname={pathname} />
          ))}
        </div>

        {/* Right: user + hamburger */}
        <div className="flex-1 flex items-center justify-end gap-2">
          <UserMenu />

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Zavřít menu' : 'Otevřít menu'}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed top-[57px] left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-lg overflow-y-auto max-h-[calc(100vh-57px)] md:hidden">
          <div className="px-4 py-3 flex flex-col gap-0.5">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 text-sm font-medium px-3 py-2.5 rounded-lg transition-colors ${
                pathname === '/' ? 'text-violet-700 bg-violet-50' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 ${pathname === '/' ? 'text-violet-500' : 'text-gray-400'}`} />
              Dashboard
            </Link>
            {navGroups.map(group => {
              const isGroupOpen = mobileOpenGroup === group.label
              const GroupIcon   = group.icon
              const isGroupActive = group.children.some(c => pathname === c.href)
              return (
                <div key={group.label}>
                  <button
                    onClick={() => setMobileOpenGroup(isGroupOpen ? null : group.label)}
                    className={`w-full flex items-center justify-between text-sm font-medium px-3 py-2.5 rounded-lg transition-colors ${
                      isGroupActive
                        ? 'text-violet-700 bg-violet-50'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <GroupIcon className={`w-4 h-4 ${isGroupActive ? 'text-violet-500' : 'text-gray-400'}`} />
                      {group.label}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isGroupOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isGroupOpen && (
                    <div className="ml-8 mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-gray-100 pl-3">
                      {group.children.map(child => {
                        const Icon    = child.icon
                        const isActive = pathname === child.href
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors ${
                              isActive
                                ? 'font-medium text-violet-700 bg-violet-50'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-violet-500' : 'text-gray-400'}`} />
                            {child.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* User section */}
            <div className="border-t border-gray-100 mt-2 pt-3 flex flex-col gap-1">
              {session?.user && (
                <div className="flex items-center gap-2.5 px-3 pb-2">
                  <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold uppercase">{displayName.charAt(0)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                    <p className="text-xs text-gray-400 break-all">{session.user.email}</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => { setMobileOpen(false); signOut({ callbackUrl: '/login' }) }}
                className="flex items-center gap-2 w-full text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 px-3 py-2.5 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Odhlásit se
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
