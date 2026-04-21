'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu, X, User, LogOut, Settings, ChevronDown,
  Warehouse, ShoppingCart, Receipt, Users, Package,
  PackageCheck, PackageMinus, ClipboardList,
  FileText, CreditCard, Globe, FileOutput, Truck,
} from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { Logo } from '@/components/ui/Logo'

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
      { label: 'Skladová evidence', href: '/inventory',           icon: Warehouse      },
      { label: 'Příjemky',          href: '/receipts',            icon: PackageCheck   },
      { label: 'Výdejky',           href: '/delivery-notes',      icon: PackageMinus   },
      { label: 'Inventura',         href: '/inventory/inventura', icon: ClipboardList  },
    ],
  },
  {
    label: 'Objednávky',
    icon: ShoppingCart,
    children: [
      { label: 'Vydané',    href: '/purchase-orders',  icon: FileText    },
      { label: 'Vystavené', href: '/customer-orders',  icon: ShoppingCart},
      { label: 'Sumup',     href: '/transactions',     icon: CreditCard  },
      { label: 'Eshop',     href: '/eshop-orders',     icon: Globe       },
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
      { label: 'Katalog zboží', href: '/products',  icon: Package  },
      { label: 'Obecné',        href: '/settings',  icon: Settings },
    ],
  },
]

// ─── User menu ────────────────────────────────────────────────────────────────

function UserMenu({ onClose }: { onClose?: () => void }) {
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
    <div ref={ref} className="hidden md:flex items-center mr-2 relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 hover:border-white/60 transition-colors duration-200 text-sm text-white/80"
      >
        <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center">
          <span className="text-white text-[10px] font-bold uppercase">{displayName.charAt(0)}</span>
        </div>
        <span className="font-medium max-w-[100px] truncate">{displayName}</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
          <div className="px-3 py-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 break-all">{session.user?.email}</p>
          </div>
          <div className="border-t border-gray-200 mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); onClose?.(); signOut({ callbackUrl: '/login' }) }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Odhlásit se
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Desktop dropdown nav item ─────────────────────────────────────────────────

function NavDropdown({ group, pathname }: { group: NavGroup; pathname: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isActive = group.children.some(c => pathname === c.href || pathname.startsWith(c.href + '/'))

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className={`flex items-center gap-1 text-sm transition-colors duration-200 ${
          isActive ? 'text-white' : 'text-white/70 hover:text-white'
        }`}
      >
        {group.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-[#0f1120] border border-white/10 rounded-xl shadow-2xl py-1.5 z-50">
          {group.children.map(child => {
            const Icon = child.icon
            const isChildActive = pathname === child.href
            return (
              <Link
                key={child.href}
                href={child.href}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  isChildActive
                    ? 'text-white bg-white/[0.08]'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {child.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Hlavní komponenta ────────────────────────────────────────────────────────

export function ErpNavbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileOpenGroup, setMobileOpenGroup] = useState<string | null>(null)

  const displayName = session?.user?.name ?? session?.user?.email?.split('@')[0] ?? 'Účet'

  if (pathname === '/login') return null

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between px-6 md:px-10 py-3 bg-[#0c0e1a] border-b border-white/[0.06]">

        {/* Logo */}
        <Logo variant="light" size="lg" />

        {/* Center nav — desktop only */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          {navGroups.map((group, i) => (
            <span key={group.label} className="flex items-center gap-6">
              {i > 0 && <span className="text-white/20">•</span>}
              <NavDropdown group={group} pathname={pathname} />
            </span>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* User pill — desktop only */}
          <UserMenu />

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/80 hover:text-white hover:border-white/60 transition-colors"
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Zavřít menu' : 'Otevřít menu'}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed top-[57px] left-0 right-0 z-40 border-b border-gray-200 bg-white/98 backdrop-blur overflow-y-auto max-h-[calc(100vh-57px)] md:hidden">
          <div className="px-6 py-4 flex flex-col gap-1">
            {navGroups.map(group => {
              const isGroupOpen = mobileOpenGroup === group.label
              const GroupIcon = group.icon
              return (
                <div key={group.label}>
                  <button
                    onClick={() => setMobileOpenGroup(isGroupOpen ? null : group.label)}
                    className="w-full flex items-center justify-between text-sm font-medium text-gray-800 hover:text-gray-900 hover:bg-gray-100 px-3 py-2.5 rounded-xl transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <GroupIcon className="w-4 h-4 text-gray-500" />
                      {group.label}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isGroupOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isGroupOpen && (
                    <div className="ml-9 mt-0.5 flex flex-col gap-0.5">
                      {group.children.map(child => {
                        const Icon = child.icon
                        const isActive = pathname === child.href
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition-colors ${
                              isActive
                                ? 'font-medium text-violet-700 bg-violet-50'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            {child.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* User section in mobile */}
            <div className="border-t border-gray-200 mt-2 pt-3 flex flex-col gap-1">
              {session?.user && (
                <div className="flex items-center gap-2 px-3 pb-2">
                  <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                    <span className="text-white text-[11px] font-bold uppercase">{displayName.charAt(0)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                    <p className="text-xs text-gray-500 break-all">{session.user.email}</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => { setMobileOpen(false); signOut({ callbackUrl: '/login' }) }}
                className="flex items-center gap-2 w-full text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 px-3 py-2.5 rounded-xl transition-colors"
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
