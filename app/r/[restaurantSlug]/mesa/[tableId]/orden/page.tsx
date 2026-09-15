'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCartRealtime } from '@/hooks/use-cart-realtime'
import { CartItemRow } from '@/components/cart-item-row'
import { EmptyCartState } from '@/components/empty-cart-state'
import { getDeviceToken } from '@/lib/session/device-token'
import { resumeSession } from '@/lib/data/session'
import { updateCartItemQuantity, removeCartItem } from '@/lib/data/cart'
import { submitOrderRound } from '@/lib/data/orders'

export default function MiOrdenPage() {
  const params = useParams<{ restaurantSlug: string; tableId: string }>()
  const router = useRouter()
  const [tableSessionId, setTableSessionId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const token = getDeviceToken()
      if (!token) {
        router.replace(`/r/${params.restaurantSlug}/mesa/${params.tableId}`)
        return
      }
      const session = await resumeSession(token)
      if (!session || session.sessionStatus !== 'open') {
        router.replace(`/r/${params.restaurantSlug}/mesa/${params.tableId}`)
        return
      }
      setTableSessionId(session.tableSessionId)
    }
    load()
  }, [params.restaurantSlug, params.tableId, router])

  const { items, loading } = useCartRealtime(tableSessionId)
  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPriceSnapshot, 0)

  async function handleQuantityChange(cartItemId: string, quantity: number) {
    const token = getDeviceToken()!
    await updateCartItemQuantity(token, cartItemId, quantity)
  }

  async function handleRemove(cartItemId: string) {
    const token = getDeviceToken()!
    await removeCartItem(token, cartItemId)
  }

  async function handleSubmit() {
    const token = getDeviceToken()!
    await submitOrderRound(token)
    router.push(`/r/${params.restaurantSlug}/mesa/${params.tableId}/orden/confirmado`)
  }

  if (loading) return null

  if (items.length === 0) {
    return (
      <main className="flex min-h-screen flex-col bg-background">
        <EmptyCartState onBrowseMenu={() => router.push(`/r/${params.restaurantSlug}/mesa/${params.tableId}/menu`)} />
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-background p-4">
      <h1 className="text-headline-md text-onSurface">Mi Orden</h1>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <CartItemRow key={item.id} item={item} onQuantityChange={handleQuantityChange} onRemove={handleRemove} />
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-outline pt-4">
        <p className="text-title-lg text-onSurface">Total: ${total.toFixed(2)}</p>
        <button onClick={handleSubmit} className="rounded-md bg-primary px-6 py-3 font-semibold text-onPrimary">
          Enviar pedido
        </button>
      </div>
    </main>
  )
}
