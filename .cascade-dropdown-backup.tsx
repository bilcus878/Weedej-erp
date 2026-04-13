// Windows-style cascading dropdown menu - backup pro použití v jiných formulářích
// Použití: dropdown pro výběr produktů s kategoriemi

// State variables needed:
const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null)
const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
const [categoryRect, setCategoryRect] = useState<DOMRect | null>(null)
const categoryMenuRef = useRef<HTMLDivElement>(null)
const hideSubmenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)

// JSX Code for the dropdown:
/*
<button
  type="button"
  onClick={() => setOpenDropdownIndex(openDropdownIndex === index ? null : index)}
  onBlur={(e) => {
    // Zavři dropdown po kliknutí mimo (s malým timeoutem kvůli hover efektu)
    const target = e.currentTarget
    setTimeout(() => {
      if (target && !target.contains(document.activeElement)) {
        setOpenDropdownIndex(null)
        setHoveredCategory(null)
      }
    }, 200)
  }}
  className="w-full border rounded px-2 py-2 text-sm text-left bg-white hover:bg-gray-50 flex items-center justify-between"
>
  <span className={item.productId ? 'text-gray-900' : 'text-gray-500'}>
    {item.productId
      ? products.find(p => p.id === item.productId)?.name
      : 'Vyberte produkt...'}
  </span>
  <ChevronDown className="w-4 h-4 text-gray-400" />
</button>

{openDropdownIndex === index && (
  <>
    <div
      ref={categoryMenuRef}
      className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-[500px] overflow-y-auto"
      onMouseLeave={() => {
        hideSubmenuTimeoutRef.current = setTimeout(() => {
          setHoveredCategory(null)
          setCategoryRect(null)
        }, 500)
      }}
      onMouseEnter={() => {
        if (hideSubmenuTimeoutRef.current) {
          clearTimeout(hideSubmenuTimeoutRef.current)
          hideSubmenuTimeoutRef.current = null
        }
      }}
    >
      {(() => {
        const categories = new Set<string>()
        products.forEach(p => {
          if (p.category) {
            categories.add(p.category.name)
          }
        })
        const categoryArray = Array.from(categories).sort()

        return (
          <>
            {categoryArray.map(cat => (
              <div
                key={cat}
                className="relative"
                onMouseEnter={(e) => {
                  if (hideSubmenuTimeoutRef.current) {
                    clearTimeout(hideSubmenuTimeoutRef.current)
                    hideSubmenuTimeoutRef.current = null
                  }
                  setHoveredCategory(cat)
                  setCategoryRect(e.currentTarget.getBoundingClientRect())
                }}
                onMouseLeave={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  if (e.clientX > rect.right) {
                    if (hideSubmenuTimeoutRef.current) {
                      clearTimeout(hideSubmenuTimeoutRef.current)
                      hideSubmenuTimeoutRef.current = null
                    }
                    return
                  }
                  hideSubmenuTimeoutRef.current = setTimeout(() => {
                    setHoveredCategory(null)
                    setCategoryRect(null)
                  }, 500)
                }}
              >
                <div className="px-4 py-2.5 hover:bg-blue-50 text-sm flex items-center gap-2 select-none">
                  <span>{cat}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                </div>
              </div>
            ))}

            {products.filter(p => !p.category).length > 0 && (
              <div
                className="relative"
                onMouseEnter={(e) => {
                  if (hideSubmenuTimeoutRef.current) {
                    clearTimeout(hideSubmenuTimeoutRef.current)
                    hideSubmenuTimeoutRef.current = null
                  }
                  setHoveredCategory('__no_category__')
                  setCategoryRect(e.currentTarget.getBoundingClientRect())
                }}
                onMouseLeave={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  if (e.clientX > rect.right) {
                    if (hideSubmenuTimeoutRef.current) {
                      clearTimeout(hideSubmenuTimeoutRef.current)
                      hideSubmenuTimeoutRef.current = null
                    }
                    return
                  }
                  hideSubmenuTimeoutRef.current = setTimeout(() => {
                    setHoveredCategory(null)
                    setCategoryRect(null)
                  }, 500)
                }}
              >
                <div className="px-4 py-2.5 hover:bg-blue-50 text-sm flex items-center gap-2 select-none">
                  <span className="italic text-gray-600">Bez kategorie</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                </div>
              </div>
            )}
          </>
        )
      })()}
    </div>

    {hoveredCategory && categoryRect && categoryMenuRef.current && (() => {
      const filteredProducts = products.filter(p =>
        hoveredCategory === '__no_category__'
          ? !p.category
          : p.category?.name === hoveredCategory
      )

      const maxLength = Math.max(
        ...filteredProducts.map(p => p.name.length + (p.unit?.length || 0) + 3)
      )
      const estimatedWidth = Math.min(Math.max(maxLength * 7 + 60, 250), 600)

      return (
        <div
          className="fixed bg-white border border-gray-300 rounded shadow-xl max-h-[500px] overflow-y-auto z-[60]"
          style={{
            width: `${estimatedWidth}px`,
            left: `${categoryRect.right}px`,
            top: `${categoryRect.top}px`,
          }}
          onMouseEnter={() => {
            if (hideSubmenuTimeoutRef.current) {
              clearTimeout(hideSubmenuTimeoutRef.current)
              hideSubmenuTimeoutRef.current = null
            }
          }}
          onMouseLeave={() => {
            hideSubmenuTimeoutRef.current = setTimeout(() => {
              setHoveredCategory(null)
              setCategoryRect(null)
            }, 200)
          }}
        >
          {filteredProducts.map(p => (
            <div
              key={p.id}
              onMouseDown={(e) => {
                e.preventDefault()
                handleItemChange(index, 'productId', p.id)
                setOpenDropdownIndex(null)
                setHoveredCategory(null)
                setCategoryRect(null)
              }}
              className="px-4 py-2.5 hover:bg-blue-100 cursor-pointer text-sm flex items-center gap-2"
            >
              <span>{p.name}</span>
              <span className="text-xs text-gray-500">
                ({p.unit})
              </span>
            </div>
          ))}
        </div>
      )
    })()}
  </>
)}
*/
