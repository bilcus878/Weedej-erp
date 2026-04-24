'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface NavbarMeta {
  count: string
  subTitle?: string
  pageTitleOnClick?: (() => void) | null
  actions?: ReactNode
}

interface NavbarMetaCtx {
  meta: NavbarMeta
  setMeta: (m: Partial<NavbarMeta>) => void
}

const Ctx = createContext<NavbarMetaCtx>({
  meta: { count: '' },
  setMeta: () => {},
})

export function NavbarMetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMetaState] = useState<NavbarMeta>({ count: '' })
  // Stable reference — safe to use as useEffect dependency in consumers
  const setMeta = useCallback(
    (m: Partial<NavbarMeta>) => setMetaState(prev => ({ ...prev, ...m })),
    []
  )
  return <Ctx.Provider value={{ meta, setMeta }}>{children}</Ctx.Provider>
}

export function useNavbarMeta() {
  return useContext(Ctx)
}
