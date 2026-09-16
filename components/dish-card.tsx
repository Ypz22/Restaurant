import type { MenuDish } from '@/lib/data/menu'

export function DishCard({ dish, onClick }: { dish: MenuDish; onClick: (id: string) => void }) {
  return (
    <button
      onClick={() => dish.isAvailable && onClick(dish.id)}
      disabled={!dish.isAvailable}
      className="flex w-full items-center justify-between rounded-lg bg-surface p-4 text-left disabled:opacity-50"
    >
      <div>
        <p className="text-title-md text-onSurface">{dish.name}</p>
        <p className="text-body-md text-onSurface/70">{dish.description}</p>
        {!dish.isAvailable && <p className="text-label-sm uppercase text-brasa-primary">Agotado</p>}
      </div>
      <p className="text-title-md font-semibold text-brasa-primary">${dish.price.toFixed(2)}</p>
    </button>
  )
}
