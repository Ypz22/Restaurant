export function DishSearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Buscar en el menú..."
      className="rounded-full border border-outline bg-surface px-4 py-2 text-onSurface"
    />
  )
}
