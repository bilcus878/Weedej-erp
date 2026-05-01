'use client'

import { useState, useRef, useEffect, Fragment } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  Menu, X, LogOut, ChevronDown, LayoutDashboard,
} from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { Logo } from '@/components/ui/Logo'
import { useNavbarMeta } from '@/components/NavbarMetaContext'
import { PermissionGate } from '@/components/erp/PermissionGate'
import { navGroups, getPageTitle, type NavChild, type NavGroup } from '@/config/nav'
import type { ReadonlyURLSearchParams } from 'next/navigation'

// ─── Active-state helper ──────────────────────────────────────────────────────
//
// Compares a nav href (which may carry ?param=value) against the current
// pathname + search params. All query-param keys in the href must match the
// current URL; extra params in the current URL are ignored.

function matchesHref(
  href:         string,
  pathname:     string,
  searchParams: ReadonlyURLSearchParams | null,
): boolean {
  const childPath = href.split('?')[0]
  const pathMatch = pathname === childPath || pathname.startsWith(childPath + '/')
  if (!pathMatch) return false
  if (!href.includes('?')) return true
  if (!searchParams) return false

  const required = new URLSearchParams(href.split('?')[1])
  for (const [key, value] of required.entries()) {
    if (searchParams.get(key) !== value) return false
  }
  return true
}

// ─── Section divider ──────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-3.5 pt-2 pb-0.5">
      <div className="flex items-center gap-1.5">
        <div className="h-px flex-1 bg-gray-100" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 select-none">
          {label}
        </span>
        <div className="h-px flex-1 bg-gray-100" />
      </div>
    </div>
  )
}

// ─── Single dropdown item ─────────────────────────────────────────────────────

function DropdownItem({
  child, pathname, searchParams,
}: {
  child:        NavChild
  pathname:     string
  searchParams: ReadonlyURLSearchParams | null
}) {
  const Icon     = child.icon
  const isActive = matchesHref(child.href, pathname, searchParams)
  return (
    <Link
      href={child.href}
      className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors ${
        isActive
          ? 'text-violet-700 bg-violet-50 font-medium'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-violet-500' : 'text-gray-400'}`} />
      {child.label}
    </Link>
  )
}

// ─── Desktop dropdown ─────────────────────────────────────────────────────────
//
// Hover mode: the pt-2 wrapper extends the mouse region into the gap between
// trigger and panel so onMouseLeave doesn't fire while crossing it.
// Click mode: closes on outside mousedown via a document listener.
//
// Children are partitioned into three tiers:
//   1. main    — no sectionLabel, no permission
//   2. middle  — no permission, has sectionLabel (grouped by label, rendered with header)
//   3. admin   — has permission (optionally has sectionLabel, rendered inside PermissionGate)

function NavDropdown({
  group, pathname, searchParams,
}: {
  group:        NavGroup
  pathname:     string
  searchParams: ReadonlyURLSearchParams | null
}) {
  const [open, setOpen] = useState(false)
  const ref     = useRef<HTMLDivElement>(null)
  const isClick = group.triggerMode === 'click'

  useEffect(() => {
    if (!isClick) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isClick])

  const isActive = group.children.some(c => matchesHref(c.href, pathname, searchParams))

  // Partition children
  const mainItems   = group.children.filter(c => !c.permission && !c.sectionLabel)
  const middleItems = group.children.filter(c => !c.permission && !!c.sectionLabel)
  const adminItems  = group.children.filter(c => !!c.permission)
  const adminPerms  = adminItems.map(c => c.permission!)

  // Group middle items by sectionLabel (preserving insertion order)
  const middleSections = middleItems.reduce<{ label: string; items: NavChild[] }[]>((acc, child) => {
    const existing = acc.find(s => s.label === child.sectionLabel)
    if (existing) existing.items.push(child)
    else acc.push({ label: child.sectionLabel!, items: [child] })
    return acc
  }, [])

  // Label for the admin section (taken from the first admin item that declares one)
  const adminSectionLabel = adminItems.find(c => c.sectionLabel)?.sectionLabel

  return (
    <div
      ref={ref}
      className="relative"
      {...(!isClick ? {
        onMouseEnter: () => setOpen(true),
        onMouseLeave: () => setOpen(false),
      } : {})}
    >
      <button
        onClick={isClick ? () => setOpen(o => !o) : undefined}
        className={`flex items-center gap-1 text-sm font-medium transition-colors duration-150 py-1 ${
          isActive ? 'text-violet-600' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        {group.label}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 z-50">
          <div className="pt-2">
            <div className={`bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 ring-1 ring-black/5 ${group.dropdownWidth ?? 'w-52'}`}>

              {/* Tier 1 — main items */}
              {mainItems.map(child => (
                <DropdownItem
                  key={child.href}
                  child={child}
                  pathname={pathname}
                  searchParams={searchParams}
                />
              ))}

              {/* Tier 2 — middle sections with labels */}
              {middleSections.map(section => (
                <Fragment key={section.label}>
                  <SectionHeader label={section.label} />
                  {section.items.map(child => (
                    <DropdownItem
                      key={child.href}
                      child={child}
                      pathname={pathname}
                      searchParams={searchParams}
                    />
                  ))}
                </Fragment>
              ))}

              {/* Tier 3 — admin items (entire block gated by any admin permission) */}
              {adminItems.length > 0 && (
                <PermissionGate permission={adminPerms}>
                  {adminSectionLabel && <SectionHeader label={adminSectionLabel} />}
                  {adminItems.map(child => (
                    <PermissionGate key={child.href} permission={child.permission!}>
                      <DropdownItem
                        child={child}
                        pathname={pathname}
                        searchParams={searchParams}
                      />
                    </PermissionGate>
                  ))}
                </PermissionGate>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
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

// ─── Main component ───────────────────────────────────────────────────────────

export function ErpNavbar() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen]           = useState(false)
  const [mobileOpenGroup, setMobileOpenGroup] = useState<string | null>(null)

  const displayName = session?.user?.name ?? session?.user?.email?.split('@')[0] ?? 'Účet'
  const pageTitle   = getPageTitle(pathname)
  const { meta }    = useNavbarMeta()

  if (pathname === '/login') return null

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between px-6 md:px-10 h-[57px] bg-white border-b border-gray-200 shadow-sm">

        {/* Left: Logo + breadcrumb */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <Logo variant="dark" size="md" />
          {pageTitle && (
            <>
              <span className="text-gray-300 text-lg font-light select-none">/</span>
              {meta.pageTitleOnClick
                ? <button onClick={meta.pageTitleOnClick} className="text-sm font-medium text-blue-600 hover:underline truncate">{pageTitle}</button>
                : <span className="text-sm font-medium text-gray-700 truncate">{pageTitle}</span>
              }
            </>
          )}
          {meta.subTitle && (
            <>
              <span className="text-gray-300 text-lg font-light select-none">/</span>
              <span className="text-sm font-medium text-gray-700 truncate">{meta.subTitle}</span>
            </>
          )}
          {meta.count && (
            <span className="text-xs text-gray-400 hidden sm:block whitespace-nowrap">{meta.count}</span>
          )}
        </div>

        {/* Center: nav — desktop only */}
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
            <NavDropdown
              key={group.label}
              group={group}
              pathname={pathname}
              searchParams={searchParams}
            />
          ))}
        </div>

        {/* Right: page actions + user + hamburger */}
        <div className="flex-1 flex items-center justify-end gap-2">
          {meta.actions && (
            <div className="hidden md:flex items-center">
              {meta.actions}
            </div>
          )}
          <UserMenu />

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

            {/* Dashboard */}
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

            {/* Nav groups */}
            {navGroups.map(group => {
              const isGroupOpen   = mobileOpenGroup === group.label
              const GroupIcon     = group.icon
              const isGroupActive = group.children.some(c => matchesHref(c.href, pathname, searchParams))

              const mainItems   = group.children.filter(c => !c.permission && !c.sectionLabel)
              const middleItems = group.children.filter(c => !c.permission && !!c.sectionLabel)
              const adminItems  = group.children.filter(c => !!c.permission)
              const adminPerms  = adminItems.map(c => c.permission!)
              const adminSectionLabel = adminItems.find(c => c.sectionLabel)?.sectionLabel

              const middleSections = middleItems.reduce<{ label: string; items: NavChild[] }[]>((acc, child) => {
                const existing = acc.find(s => s.label === child.sectionLabel)
                if (existing) existing.items.push(child)
                else acc.push({ label: child.sectionLabel!, items: [child] })
                return acc
              }, [])

              return (
                <div key={group.label}>
                  <button
                    onClick={() => setMobileOpenGroup(isGroupOpen ? null : group.label)}
                    className={`w-full flex items-center justify-between text-sm font-medium px-3 py-2.5 rounded-lg transition-colors ${
                      isGroupActive ? 'text-violet-700 bg-violet-50' : 'text-gray-700 hover:bg-gray-50'
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

                      {/* Tier 1 */}
                      {mainItems.map(child => {
                        const Icon     = child.icon
                        const isActive = matchesHref(child.href, pathname, searchParams)
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors ${
                              isActive ? 'font-medium text-violet-700 bg-violet-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-violet-500' : 'text-gray-400'}`} />
                            {child.label}
                          </Link>
                        )
                      })}

                      {/* Tier 2 — middle sections */}
                      {middleSections.map(section => (
                        <Fragment key={section.label}>
                          <p className="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 select-none">
                            {section.label}
                          </p>
                          {section.items.map(child => {
                            const Icon     = child.icon
                            const isActive = matchesHref(child.href, pathname, searchParams)
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors ${
                                  isActive ? 'font-medium text-violet-700 bg-violet-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                              >
                                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-violet-500' : 'text-gray-400'}`} />
                                {child.label}
                              </Link>
                            )
                          })}
                        </Fragment>
                      ))}

                      {/* Tier 3 — admin items */}
                      {adminItems.length > 0 && (
                        <PermissionGate permission={adminPerms}>
                          {adminSectionLabel && (
                            <p className="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 select-none">
                              {adminSectionLabel}
                            </p>
                          )}
                          {adminItems.map(child => {
                            const Icon     = child.icon
                            const isActive = matchesHref(child.href, pathname, searchParams)
                            return (
                              <PermissionGate key={child.href} permission={child.permission!}>
                                <Link
                                  href={child.href}
                                  onClick={() => setMobileOpen(false)}
                                  className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors ${
                                    isActive ? 'font-medium text-violet-700 bg-violet-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                  }`}
                                >
                                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-violet-500' : 'text-gray-400'}`} />
                                  {child.label}
                                </Link>
                              </PermissionGate>
                            )
                          })}
                        </PermissionGate>
                      )}

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
