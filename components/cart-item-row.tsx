import type { CartItemWithDetails } from '@/lib/data/cart'
import { QuantityStepper } from '@/components/quantity-stepper'

export function CartItemRow({
  item,
  onQuantityChange,
  onRemove,
}: {
  item: CartItemWithDetails
  onQuantityChange: (id: string, quantity: number) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface p-4">
      <div>
        <p className="text-title-md text-onSurface">{item.dishName}</p>
        <p className="text-label-md text-onSurface/60">Agregado por {item.dinerNickname}</p>
      </div>
      <div className="flex items-center gap-4">
        <QuantityStepper
          value={item.quantity}
          min={0}
          onChange={(q) => (q === 0 ? onRemove(item.id) : onQuantityChange(item.id, q))}
        />
        <p className="text-title-md font-semibold text-brasa-primary">
          ${(item.quantity * item.unitPriceSnapshot).toFixed(2)}
        </p>
      </div>
    </div>
  )
}
