'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface NavbarMeta {
  count: string
}

interface NavbarMetaCtx {
  meta: NavbarMeta
  setMeta: (m: NavbarMeta) => void
}

const Ctx = createContext<NavbarMetaCtx>({
  meta: { count: '' },
  setMeta: () => {},
})

export function NavbarMetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<NavbarMeta>({ count: '' })
  return <Ctx.Provider value={{ meta, setMeta }}>{children}</Ctx.Provider>
}

export function useNavbarMeta() {
  return useContext(Ctx)
}
