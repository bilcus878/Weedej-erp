import { Card, CardContent } from '@/components/ui/Card'
import type { InventuraStats as IStats } from '../types'

interface Props {
  stats: IStats
}

const CARDS = [
  { key: 'total',       label: 'Celkem produktů', color: 'slate'  },
  { key: 'checked',     label: 'Zkontrolováno',   color: 'blue'   },
  { key: 'differences', label: 'Rozdílů',          color: 'purple' },
  { key: 'surpluses',   label: 'Přebytků',         color: 'green'  },
  { key: 'shortages',   label: 'Mank',             color: 'red'    },
] as const

export function InventuraStats({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {CARDS.map(({ key, label, color }) => (
        <Card key={key} className={`bg-${color}-50`}>
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold text-${color}-900`}>{stats[key]}</p>
            <p className={`text-xs text-${color}-600`}>{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
