'use client'

interface Props { children: React.ReactNode; cols?: 2 | 3 | 4 | 5 }

const colCls: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
}

export function KpiGrid({ children, cols = 4 }: Props) {
  return (
    <div className={`grid gap-4 ${colCls[cols]}`}>
      {children}
    </div>
  )
}
