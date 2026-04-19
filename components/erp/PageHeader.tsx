import { type LucideIcon, RefreshCw } from 'lucide-react'

type AccentColor = 'emerald' | 'blue' | 'purple' | 'rose' | 'amber'

interface Props {
  title: string
  icon: LucideIcon
  color: AccentColor
  total: number
  filtered: number
  onRefresh?: () => void
}

const colorMap: Record<AccentColor, { gradient: string; border: string; title: string; count: string }> = {
  emerald: { gradient: 'from-slate-50 to-emerald-50', border: 'border-emerald-500', title: 'text-emerald-600', count: 'text-emerald-600' },
  blue:    { gradient: 'from-slate-50 to-blue-50',    border: 'border-blue-500',    title: 'text-blue-600',    count: 'text-blue-600'    },
  purple:  { gradient: 'from-slate-50 to-purple-50',  border: 'border-purple-500',  title: 'text-purple-600',  count: 'text-purple-600'  },
  rose:    { gradient: 'from-slate-50 to-rose-50',    border: 'border-rose-500',    title: 'text-rose-600',    count: 'text-rose-600'    },
  amber:   { gradient: 'from-slate-50 to-amber-50',   border: 'border-amber-500',   title: 'text-amber-600',   count: 'text-amber-600'   },
}

export function PageHeader({ title, icon: Icon, color, total, filtered, onRefresh }: Props) {
  const c = colorMap[color]
  return (
    <div className={`relative bg-gradient-to-r ${c.gradient} border-l-4 ${c.border} rounded-lg shadow-sm py-4 px-6`}>
      <div className="text-center">
        <h1 className={`text-2xl font-bold ${c.title} flex items-center justify-center gap-2`}>
          <Icon className="w-6 h-6" />
          {title}
          <span className="text-sm font-normal text-gray-600 ml-1">
            (Zobrazeno{' '}
            <span className={`font-semibold ${c.count}`}>{filtered}</span>
            {' '}z{' '}
            <span className="font-semibold text-gray-700">{total}</span>)
          </span>
        </h1>
      </div>
      {onRefresh && (
        <div className="absolute top-3 right-4">
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 font-medium rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Obnovit
          </button>
        </div>
      )}
    </div>
  )
}
