type Category = { id: string; name: string; sortOrder: number }

export function CategoryTabs({
  categories,
  activeId,
  onSelect,
}: {
  categories: Category[]
  activeId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {categories.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={`rounded-full px-4 py-2 text-label-lg whitespace-nowrap ${
            c.id === activeId ? 'bg-primary text-onPrimary' : 'bg-surface text-onSurface'
          }`}
        >
          {c.name}
        </button>
      ))}
    </div>
  )
}
