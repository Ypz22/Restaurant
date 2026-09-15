'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { QuantityStepper } from '@/components/quantity-stepper'
import { getTableByQrToken } from '@/lib/data/table'
import { getMenu, type MenuDish } from '@/lib/data/menu'
import { getDeviceToken } from '@/lib/session/device-token'
import { addCartItem } from '@/lib/data/cart'

export default function DishDetailPage() {
  const params = useParams<{ restaurantSlug: string; tableId: string; dishId: string }>()
  const router = useRouter()
  const [dish, setDish] = useState<MenuDish | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    async function load() {
      const table = await getTableByQrToken(params.tableId)
      if (!table) return
      const menu = await getMenu(table.restaurantId)
      setDish(menu.dishes.find((d) => d.id === params.dishId) ?? null)
    }
    load()
  }, [params.tableId, params.dishId])

  async function handleAdd() {
    const token = getDeviceToken()
    if (!token || !dish) return
    setError(null)
    setAdding(true)
    try {
      await addCartItem(token, dish.id, quantity, notes)
      router.push(`/r/${params.restaurantSlug}/mesa/${params.tableId}/orden`)
    } catch {
      setError('No se pudo agregar el plato, intenta de nuevo.')
      setAdding(false)
    }
  }

  if (!dish) return null

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-background p-4">
      <h1 className="text-headline-md text-onSurface">{dish.name}</h1>
      <p className="text-body-lg text-onSurface/80">{dish.description}</p>
      <p className="text-title-lg font-semibold text-primary">${dish.price.toFixed(2)}</p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas (ej. sin cebolla)"
        className="rounded-md border border-outline bg-surface p-3"
      />
      <QuantityStepper value={quantity} onChange={(v) => setQuantity(Math.max(1, v))} min={1} />
      {error && <p className="text-primary">{error}</p>}
      <button
        onClick={handleAdd}
        disabled={adding}
        className="rounded-md bg-primary px-6 py-3 font-semibold text-onPrimary disabled:opacity-50"
      >
        Agregar al pedido
      </button>
    </main>
  )
}
