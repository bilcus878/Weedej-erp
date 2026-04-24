import { Search, Filter } from 'lucide-react'
import Input from '@/components/ui/Input'

interface Props {
  searchQuery: string
  setSearchQuery: (v: string) => void
  categoryFilter: string
  setCategoryFilter: (v: string) => void
  showOnlyDiffs: boolean
  setShowOnlyDiffs: (v: boolean) => void
  categories: { id: string; name: string }[]
}

export function InventuraFilters({
  searchQuery, setSearchQuery,
  categoryFilter, setCategoryFilter,
  showOnlyDiffs, setShowOnlyDiffs,
  categories,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[200px] relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Hledat produkt…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <select
        value={categoryFilter}
        onChange={e => setCategoryFilter(e.target.value)}
        className="h-10 rounded-md border border-gray-300 px-3 min-w-[180px] text-sm"
      >
        <option value="">Všechny kategorie</option>
        {categories.map(cat => (
          <option key={cat.id} value={cat.id}>{cat.name}</option>
        ))}
      </select>

      <button
        onClick={() => setShowOnlyDiffs(!showOnlyDiffs)}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          showOnlyDiffs
            ? 'bg-purple-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <Filter className="h-4 w-4" />
        Jen rozdíly
      </button>
    </div>
  )
}
