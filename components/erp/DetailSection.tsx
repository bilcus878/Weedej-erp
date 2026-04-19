import { type LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface Props {
  title: string
  icon?: LucideIcon
  colSpan?: string
  children: ReactNode
  accentColor?: 'gray' | 'red' | 'green'
  headerRight?: ReactNode
}

export function DetailSection({ title, icon: Icon, colSpan = '', children, accentColor = 'gray', headerRight }: Props) {
  const headerBg =
    accentColor === 'red'   ? 'bg-red-50 border-red-200' :
    accentColor === 'green' ? 'bg-green-50 border-green-200' :
                              'bg-gray-100 border-gray-200'
  const headerText =
    accentColor === 'red'   ? 'text-red-700' :
    accentColor === 'green' ? 'text-green-700' :
                              'text-gray-900'

  return (
    <div className={`${colSpan} border border-gray-200 rounded-lg overflow-hidden flex flex-col`}>
      <h4 className={`font-bold text-sm ${headerText} px-4 py-2 ${headerBg} border-b flex items-center justify-between gap-2 shrink-0`}>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-gray-500" />}
          {title}
        </div>
        {headerRight}
      </h4>
      <div className="flex-1 px-4 py-2.5 text-sm bg-white">
        {children}
      </div>
    </div>
  )
}
