import { ClipboardList, Play } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'

interface Props {
  onStart: () => void
}

export function InventuraGuide({ onStart }: Props) {
  return (
    <Card>
      <CardContent className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mb-3">
              <ClipboardList className="h-7 w-7 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Jak provést inventuru?</h2>
          </div>

          <div className="space-y-4 text-gray-600 mb-8">
            {([
              ['Klikněte na ', '"Zahájit inventuru"', ' pro načtení seznamu produktů'],
              ['Pro každý produkt zadejte ', 'skutečné množství', ' na skladě. Pokud se shoduje, klikněte na ', '"="'],
              ['Systém automaticky vypočítá ', 'rozdíly', ' (manko/přebytek)'],
              ['Klikněte na ', '"Uložit inventuru"', ' pro aplikování změn do skladu'],
            ] as [string, string, string?, string?][]).map(([pre, bold, mid, bold2], i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p>
                  {pre}<strong>{bold}</strong>{mid && mid}{bold2 && <strong>{bold2}</strong>}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2.5 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Play className="h-4 w-4" />
              Zahájit inventuru
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
